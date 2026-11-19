package com.ferrnd.quotes

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import java.time.LocalTime
import java.time.ZonedDateTime

/**
 * The launcher icon follows the theme, like the page: white with black quotes
 * by day, black with white quotes from 21:00 to 06:00. With the theme fixed to
 * Light or Dark in Settings, the icon stays that way.
 *
 * Android has no API to redraw a launcher icon, so the manifest declares two
 * launcher aliases of the same activity (IconDay, IconNight) and exactly one
 * is enabled at a time. With the theme on Auto an alarm wakes the app at the
 * next 06:00 or 21:00 to swap them.
 */
object IconSwitcher {
    private const val DAY = "com.ferrnd.quotes.IconDay"
    private const val NIGHT = "com.ferrnd.quotes.IconNight"

    /** Which icon is enabled right now (true = the night one). */
    fun showingNight(context: Context): Boolean =
        context.packageManager.getComponentEnabledSetting(ComponentName(context, NIGHT)) ==
            PackageManager.COMPONENT_ENABLED_STATE_ENABLED

    /**
     * True while the app is on screen. Disabling the launcher alias that opened
     * the running task makes Android close it, so while the app is visible the
     * icon waits: MainActivity.onStop() applies it as soon as the user leaves.
     */
    @Volatile var foreground = false

    /** Show the icon the theme calls for now (unless the app is on screen), then arm the next swap. */
    fun update(context: Context, now: ZonedDateTime = ZonedDateTime.now()) {
        val theme = Prefs(context).load().theme
        if (!foreground) apply(context, isNight(theme, now.toLocalTime()))
        schedule(context, theme, now)
    }

    private fun apply(context: Context, night: Boolean) {
        if (showingNight(context) == night) return
        val pm = context.packageManager
        // enable the new one first, so there is never a moment without a launcher entry
        pm.setComponentEnabledSetting(
            ComponentName(context, if (night) NIGHT else DAY),
            PackageManager.COMPONENT_ENABLED_STATE_ENABLED, PackageManager.DONT_KILL_APP,
        )
        pm.setComponentEnabledSetting(
            ComponentName(context, if (night) DAY else NIGHT),
            PackageManager.COMPONENT_ENABLED_STATE_DISABLED, PackageManager.DONT_KILL_APP,
        )
    }

    /** The next 06:00 or 21:00, whichever comes first. */
    fun nextSwap(now: ZonedDateTime): ZonedDateTime =
        listOf(NIGHT_ENDS_AT, NIGHT_STARTS_AT)
            .map { now.toLocalDate().atTime(LocalTime.of(it, 0, 2)).atZone(now.zone) }
            .map { if (it.isAfter(now)) it else it.plusDays(1) }
            .min()

    private fun alarm(context: Context): PendingIntent = PendingIntent.getBroadcast(
        context, 1, Intent(context, IconReceiver::class.java),
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )

    private fun schedule(context: Context, theme: String, now: ZonedDateTime) {
        val am = context.getSystemService(AlarmManager::class.java) ?: return
        val pi = alarm(context)
        am.cancel(pi)
        if (theme != "auto") return
        // a few minutes late is fine for an icon, so no exact-alarm permission is needed
        am.setAndAllowWhileIdle(AlarmManager.RTC, nextSwap(now).toInstant().toEpochMilli(), pi)
    }
}

/** Fired at 06:00 and 21:00 while the theme is on Auto. */
class IconReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        IconSwitcher.update(context.applicationContext)
    }
}
