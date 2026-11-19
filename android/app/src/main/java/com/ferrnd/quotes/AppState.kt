package com.ferrnd.quotes

import android.content.Context
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import java.time.LocalDate
import java.time.LocalTime

/** Which way the quote slides when it changes (named after the site's slide directions). */
enum class Slide { None, Left, Right, Down }

/** Everything the screen shows, in one place. */
class AppState(private val context: Context, val catalog: Catalog) {
    private val prefs = Prefs(context)

    var settings by mutableStateOf(prefs.load())
        private set
    var favorites by mutableStateOf(prefs.favorites())
        private set
    var today by mutableIntStateOf(todayDay())
        private set
    var view by mutableIntStateOf(today)
        private set
    var slide by mutableStateOf(Slide.None)
        private set
    var now by mutableStateOf(LocalTime.now())
        private set

    var toast by mutableStateOf<String?>(null)
        private set
    var toastSerial by mutableIntStateOf(0)
        private set

    var panelOpen by mutableStateOf(false)
    var archiveOpen by mutableStateOf(false)

    val lang: String get() = catalog.resolve(settings.lang)
    val night: Boolean get() = isNight(settings.theme, now)
    /** Japanese, Chinese and Korean have no italic: their text stays upright. */
    val upright: Boolean get() = lang.substringBefore('-') in setOf("ja", "zh", "ko")
    val first: Int get() = minOf(catalog.launch, today)

    fun t(key: String, vararg vars: Pair<String, Any>) = Strings.t(lang, key, *vars)
    fun entry(day: Int) = catalog.entry(day, lang)
    fun dayLabel(day: Int) = t("Day {n}", "n" to catalog.dayNumber(day))

    fun update(key: String, value: String) {
        settings = settings.with(key, value)
        prefs.save(settings)
        if (key == "notify" || key == "notifyAt") Notifier.reschedule(context)
        if (key == "lang") Notifier.ensureChannel(context, lang)
        if (key == "theme") IconSwitcher.update(context)
    }

    fun goTo(day: Int, direction: Slide) {
        val target = day.coerceIn(first, today)
        if (target == view) return
        slide = if (settings.motion == "off") Slide.None else direction
        view = target
    }

    fun step(delta: Int) = goTo(view + delta, if (delta > 0) Slide.Left else Slide.Right)

    fun goToday() = goTo(today, if (view < today) Slide.Left else Slide.Right)

    /** Called every few seconds and on resume: notices midnight and the night theme. */
    fun tick() {
        now = LocalTime.now()
        val current = todayDay()
        if (current == today) return
        val wasWatchingToday = view == today
        today = current
        if (wasWatchingToday) goTo(current, Slide.Down) // the old quote drops away, the new one comes down
        else view = view.coerceIn(first, today)
    }

    fun toggleFavorite(day: Int) {
        val added = day !in favorites
        favorites = if (added) listOf(day) + favorites else favorites - day
        prefs.saveFavorites(favorites)
        show(t(if (added) "Added to favorites" else "Removed from favorites"))
    }

    fun show(message: String) {
        toast = message
        toastSerial++
    }

    companion object {
        fun todayDay(): Int = LocalDate.now().toEpochDay().toInt()
    }
}
