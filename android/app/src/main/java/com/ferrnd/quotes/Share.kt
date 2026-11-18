package com.ferrnd.quotes

import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.Typeface
import android.net.Uri
import android.os.Build
import android.provider.MediaStore
import android.text.Layout
import android.text.StaticLayout
import android.text.TextPaint
import androidx.core.content.FileProvider
import java.io.File
import java.util.Locale

const val PUBLIC_URL = "https://quoteaday.vercel.app"

/** Sharing: the same square card as the site, the Android share sheet, the gallery. */
object Share {
    private const val CARD = 1080

    fun quoteText(entry: Entry): String =
        entry.author?.let { "“${entry.text}” — $it" } ?: "“${entry.text}”"

    private fun typeface(context: Context, file: String, weight: Int): Typeface =
        Typeface.Builder(context.assets, "fonts/$file").setFontVariationSettings("'wght' $weight").build()

    /** DAY 2 / quote / rule / AUTHOR / link, centred as one block, like renderCard() on the site. */
    fun renderCard(context: Context, entry: Entry, dayLabel: String?, palette: Palette, lang: String): Bitmap {
        val ink = if (palette.night) 0xFFFFFFFF.toInt() else 0xFF000000.toInt()
        val paper = if (palette.night) 0xFF000000.toInt() else 0xFFFFFFFF.toInt()
        val faded = (ink and 0x00FFFFFF) or (0x66 shl 24)
        val bitmap = Bitmap.createBitmap(CARD, CARD, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)
        canvas.drawColor(paper)
        val locale = Locale.forLanguageTag(lang)

        val quotePaint = TextPaint(Paint.ANTI_ALIAS_FLAG).apply {
            color = ink
            typeface = typeface(context, "cormorant_italic.ttf", 400)
        }
        val max = (CARD * 0.72f).toInt()
        val text = "“${entry.text}”"
        var size = 78f
        lateinit var layout: StaticLayout
        while (true) {
            quotePaint.textSize = size
            layout = StaticLayout.Builder.obtain(text, 0, text.length, quotePaint, max)
                .setAlignment(Layout.Alignment.ALIGN_CENTER)
                .setLineSpacing(0f, 1.22f)
                .setIncludePad(false)
                .setBreakStrategy(Layout.BREAK_STRATEGY_BALANCED)
                .build()
            if (layout.height <= CARD * 0.52f || size <= 34f) break
            size -= 2f
        }

        val dayBlock = if (dayLabel != null) 90f else 0f
        val authorBlock = if (entry.author != null) 150f else 40f
        val linkBlock = 64f
        var y = (CARD - dayBlock - layout.height - authorBlock - linkBlock) / 2f

        fun caption(s: String, file: String, weight: Int, px: Float, spacing: Float, color: Int, baseline: Float) {
            val p = TextPaint(Paint.ANTI_ALIAS_FLAG).apply {
                this.color = color
                typeface = typeface(context, file, weight)
                textSize = px
                letterSpacing = spacing / px
                textAlign = Paint.Align.CENTER
            }
            // letter spacing trails after the last glyph: shift back by half of it to stay centred
            canvas.drawText(s, CARD / 2f + spacing / 2f, baseline, p)
        }

        if (dayLabel != null) {
            caption(dayLabel.uppercase(locale), "cinzel.ttf", 600, 24f, 6f, faded, y + 32f)
            y += dayBlock
        }
        canvas.save()
        canvas.translate((CARD - max) / 2f, y)
        layout.draw(canvas)
        canvas.restore()
        y += layout.height

        entry.author?.let { author ->
            y += 50f
            val rule = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = ink; strokeWidth = 2f }
            canvas.drawLine(CARD / 2f - 32f, y, CARD / 2f + 32f, y, rule)
            caption(author.uppercase(locale), "cormorant.ttf", 500, 26f, 8f, ink, y + 70f)
            y += 100f
        }
        caption(PUBLIC_URL, "cormorant.ttf", 500, 22f, 2f, faded, y + linkBlock)
        return bitmap
    }

    private fun cacheFile(context: Context, bitmap: Bitmap, name: String): Uri {
        val dir = File(context.cacheDir, "shared").apply { mkdirs() }
        dir.listFiles()?.forEach { it.delete() }
        val file = File(dir, name)
        file.outputStream().use { bitmap.compress(Bitmap.CompressFormat.PNG, 100, it) }
        return FileProvider.getUriForFile(context, "${context.packageName}.files", file)
    }

    fun shareImage(context: Context, bitmap: Bitmap, name: String, text: String, title: String) {
        val uri = cacheFile(context, bitmap, name)
        val send = Intent(Intent.ACTION_SEND)
            .setType("image/png")
            .putExtra(Intent.EXTRA_STREAM, uri)
            .putExtra(Intent.EXTRA_TEXT, "$text\n\n$PUBLIC_URL")
            .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        context.startActivity(Intent.createChooser(send, title).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    }

    fun shareText(context: Context, text: String, title: String) {
        val send = Intent(Intent.ACTION_SEND).setType("text/plain").putExtra(Intent.EXTRA_TEXT, text)
        context.startActivity(Intent.createChooser(send, title).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    }

    /** Save into Pictures/Quotes. Returns false where the gallery cannot be written without a permission. */
    fun saveImage(context: Context, bitmap: Bitmap, name: String): Boolean {
        if (Build.VERSION.SDK_INT < 29) return false
        val values = ContentValues().apply {
            put(MediaStore.Images.Media.DISPLAY_NAME, name)
            put(MediaStore.Images.Media.MIME_TYPE, "image/png")
            put(MediaStore.Images.Media.RELATIVE_PATH, "Pictures/Quotes")
            put(MediaStore.Images.Media.IS_PENDING, 1)
        }
        val resolver = context.contentResolver
        val uri = resolver.insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values) ?: return false
        return try {
            resolver.openOutputStream(uri)?.use { bitmap.compress(Bitmap.CompressFormat.PNG, 100, it) } ?: return false
            values.clear()
            values.put(MediaStore.Images.Media.IS_PENDING, 0)
            resolver.update(uri, values, null, null)
            true
        } catch (_: Exception) {
            resolver.delete(uri, null, null)
            false
        }
    }

    private val ENGINES = mapOf(
        "google" to "https://www.google.com/search?q=",
        "duckduckgo" to "https://duckduckgo.com/?q=",
        "bing" to "https://www.bing.com/search?q=",
    )

    fun search(context: Context, engine: String, query: String) {
        val base = ENGINES[engine] ?: ENGINES.getValue("google")
        val intent = Intent(Intent.ACTION_VIEW, Uri.parse(base + Uri.encode(query))).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        runCatching { context.startActivity(intent) }
    }

    fun open(context: Context, url: String) {
        runCatching { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)) }
    }
}
