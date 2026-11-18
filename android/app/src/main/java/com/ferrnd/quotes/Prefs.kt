package com.ferrnd.quotes

import android.content.Context

/** The same settings as the site, with the same defaults and value names. */
data class Settings(
    val theme: String = "auto",     // auto | light | dark
    val size: String = "m",         // s | m | l
    val motion: String = "on",      // on | off
    val counter: String = "show",   // show | hide
    val copy: String = "author",    // author | text
    val search: String = "google",  // google | duckduckgo | bing
    val lang: String = "auto",      // auto | a locale code
    val notify: String = "on",      // on | off
    val notifyAt: String = "09",    // hour, two digits
) {
    fun with(key: String, value: String): Settings = when (key) {
        "theme" -> copy(theme = value)
        "size" -> copy(size = value)
        "motion" -> copy(motion = value)
        "counter" -> copy(counter = value)
        "copy" -> copy(copy = value)
        "search" -> copy(search = value)
        "lang" -> copy(lang = value)
        "notify" -> copy(notify = value)
        "notifyAt" -> copy(notifyAt = value)
        else -> this
    }

    fun get(key: String): String = when (key) {
        "theme" -> theme
        "size" -> size
        "motion" -> motion
        "counter" -> counter
        "copy" -> copy
        "search" -> search
        "lang" -> lang
        "notify" -> notify
        "notifyAt" -> notifyAt
        else -> ""
    }

    val notifyHour: Int get() = notifyAt.toIntOrNull()?.coerceIn(0, 23) ?: 9

    companion object {
        val KEYS = listOf("theme", "size", "motion", "counter", "copy", "search", "lang", "notify", "notifyAt")
    }
}

/** Settings and favorites, kept in SharedPreferences on this phone only. */
class Prefs(context: Context) {
    private val sp = context.applicationContext.getSharedPreferences("quotes", Context.MODE_PRIVATE)

    fun load(): Settings = Settings.KEYS.fold(Settings()) { s, key ->
        sp.getString(key, null)?.let { s.with(key, it) } ?: s
    }

    fun save(settings: Settings) {
        sp.edit().apply { Settings.KEYS.forEach { putString(it, settings.get(it)) } }.apply()
    }

    /** Favorite days (days since 1970-01-01), newest first. */
    fun favorites(): List<Int> =
        sp.getString("favorites", "").orEmpty().split(',').mapNotNull { it.toIntOrNull() }

    fun saveFavorites(days: List<Int>) {
        sp.edit().putString("favorites", days.joinToString(",")).apply()
    }
}
