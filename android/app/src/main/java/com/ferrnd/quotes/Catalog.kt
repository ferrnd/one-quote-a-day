package com.ferrnd.quotes

import android.content.Context
import org.json.JSONObject
import java.util.Locale

/** What a day shows: a quote, or an unsigned dedication (author null). */
data class Entry(val day: Int, val text: String, val author: String?)

data class Language(val code: String, val name: String)

/**
 * Every quote in every language, loaded from assets/quotes.json (written by
 * `python -m tools.qotd android` from the same SQLite database as the site).
 */
class Catalog private constructor(
    val languages: List<Language>,
    private val authorOf: IntArray,
    private val texts: Map<String, Array<String>>,
    private val authors: Map<String, Array<String>>,
    private val dedications: Map<Int, Map<String, Pair<String, String?>>>,
    val launch: Int,
    legacy: Int,
) {
    val size: Int get() = authorOf.size
    val authorCount: Int get() = authors.getValue("en").size
    val calendar = Calendar(authorOf.size, legacy, launch)

    fun entry(day: Int, lang: String): Entry {
        val code = if (lang in texts) lang else "en"
        dedications[day]?.let { byLang ->
            val (text, author) = byLang[code] ?: byLang.getValue("en")
            return Entry(day, text, author)
        }
        val i = calendar.quoteForDay(day)
        return Entry(day, texts.getValue(code)[i], authors.getValue(code)[authorOf[i]])
    }

    /** "Day 1" is the launch day. */
    fun dayNumber(day: Int): Int = day - launch + 1

    /** The interface language: the saved choice, or the phone's when it is "auto". */
    fun resolve(choice: String): String {
        if (choice != "auto" && languages.any { it.code == choice }) return choice
        val locale = Locale.getDefault()
        val exact = "${locale.language}-${locale.country}"
        return languages.firstOrNull { it.code.equals(exact, ignoreCase = true) }?.code
            ?: languages.firstOrNull { it.code.substringBefore('-') == locale.language }?.code
            ?: "en"
    }

    companion object {
        @Volatile private var loaded: Catalog? = null

        fun get(context: Context): Catalog = loaded ?: synchronized(this) {
            loaded ?: parse(context.applicationContext).also { loaded = it }
        }

        private fun parse(context: Context): Catalog {
            val json = JSONObject(context.assets.open("quotes.json").bufferedReader(Charsets.UTF_8).use { it.readText() })
            val languages = json.getJSONArray("locales").let { a ->
                List(a.length()) { a.getJSONObject(it).let { o -> Language(o.getString("code"), o.getString("name")) } }
            }
            val authorOf = json.getJSONArray("author").let { a -> IntArray(a.length()) { a.getInt(it) } }
            fun strings(key: String) = json.getJSONObject(key).let { o ->
                languages.associate { lang ->
                    val a = o.getJSONArray(lang.code)
                    lang.code to Array(a.length()) { a.getString(it) }
                }
            }
            val dedications = json.getJSONArray("dedications").let { a ->
                (0 until a.length()).associate { i ->
                    val d = a.getJSONObject(i)
                    val (y, m, dd) = d.getString("day").split("-").map { it.toInt() }
                    val t = d.getJSONObject("text")
                    Civil.daysFromCivil(y, m, dd) to languages.associate { lang ->
                        val pair = t.getJSONArray(lang.code)
                        lang.code to (pair.getString(0) to (if (pair.isNull(1)) null else pair.getString(1)))
                    }
                }
            }
            val (y, m, d) = json.getString("launch").split("-").map { it.toInt() }
            return Catalog(
                languages, authorOf, strings("text"), strings("authors"), dedications,
                Civil.daysFromCivil(y, m, d), json.getInt("legacy"),
            )
        }
    }
}
