package com.ferrnd.quotes

import android.content.res.AssetManager
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import java.time.LocalTime

/** Two colours, no exceptions: ink and paper. They swap at night. */
@Immutable
data class Palette(val ink: Color, val paper: Color, val night: Boolean) {
    companion object {
        val Day = Palette(ink = Color.Black, paper = Color.White, night = false)
    }
}

val LocalPalette = staticCompositionLocalOf { Palette.Day }

const val NIGHT_STARTS_AT = 21
const val NIGHT_ENDS_AT = 6

fun isNight(theme: String, now: LocalTime = LocalTime.now()): Boolean = when (theme) {
    "dark" -> true
    "light" -> false
    else -> now.hour >= NIGHT_STARTS_AT || now.hour < NIGHT_ENDS_AT
}

/** The site's typefaces, bundled (variable fonts, so one file covers every weight). */
class Fonts(assets: AssetManager) {
    val serif = FontFamily(
        Font("fonts/cormorant.ttf", assets, FontWeight.Normal),
        Font("fonts/cormorant.ttf", assets, FontWeight.Medium),
        Font("fonts/cormorant.ttf", assets, FontWeight.SemiBold),
        Font("fonts/cormorant.ttf", assets, FontWeight.Bold),
        Font("fonts/cormorant_italic.ttf", assets, FontWeight.Normal, FontStyle.Italic),
        Font("fonts/cormorant_italic.ttf", assets, FontWeight.Medium, FontStyle.Italic),
    )
}

val LocalFonts = staticCompositionLocalOf<Fonts> { error("fonts not provided") }
