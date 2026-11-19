package com.ferrnd.quotes

import android.Manifest
import android.app.AlarmManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import java.time.LocalDate
import java.time.LocalTime
import java.time.ZonedDateTime
import kotlin.concurrent.thread

/**
 * The daily notification. One alarm is armed at a time, for the next
 * occurrence of the chosen hour; when it fires, the receiver posts that day's
 * quote (worked out at that moment, in the current language) and arms the
 * next one. Reboots, clock and time-zone changes and app updates re-arm it.
 */
object Notifier {
    private const val CHANNEL = "daily"
    private const val NOTIFICATION_ID = 1
    private const val LAST_SHOWN = "notify:last"

    fun canPost(context: Context): Boolean =
        (Build.VERSION.SDK_INT < 33 ||
            ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) ==
            PackageManager.PERMISSION_GRANTED) &&
            NotificationManagerCompat.from(context).areNotificationsEnabled()

    private fun alarm(context: Context): PendingIntent = PendingIntent.getBroadcast(
        context, 0, Intent(context, DailyReceiver::class.java),
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )

    /** The next moment the clock shows hour:00, a few seconds in. */
    fun nextTrigger(hour: Int, now: ZonedDateTime = ZonedDateTime.now()): ZonedDateTime {
        val today = now.toLocalDate().atTime(LocalTime.of(hour, 0, 5)).atZone(now.zone)
        return if (today.isAfter(now)) today else today.plusDays(1)
    }

    fun reschedule(context: Context) {
        val settings = Prefs(context).load()
        val am = context.getSystemService(AlarmManager::class.java) ?: return
        val pi = alarm(context)
        am.cancel(pi)
        if (settings.notify != "on") return
        val at = nextTrigger(settings.notifyHour).toInstant().toEpochMilli()
        if (Build.VERSION.SDK_INT < 31 || am.canScheduleExactAlarms()) {
            am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi)
        } else {
            // without the exact-alarm permission Android may deliver it a few minutes late
            am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi)
        }
    }

    fun ensureChannel(context: Context, lang: String) {
        val nm = context.getSystemService(NotificationManager::class.java) ?: return
        val channel = NotificationChannel(CHANNEL, Strings.t(lang, "Quote of the day"), NotificationManager.IMPORTANCE_DEFAULT)
        channel.enableVibration(false)
        channel.setShowBadge(false)
        nm.createNotificationChannel(channel) // creating again only renames it
    }

    /** Post today's quote, once per day. */
    fun show(context: Context) {
        val prefs = context.getSharedPreferences("quotes", Context.MODE_PRIVATE)
        val settings = Prefs(context).load()
        if (settings.notify != "on" || !canPost(context)) return
        val today = LocalDate.now().toEpochDay().toInt()
        if (prefs.getInt(LAST_SHOWN, Int.MIN_VALUE) == today) return

        val catalog = Catalog.get(context)
        val lang = catalog.resolve(settings.lang)
        val entry = catalog.entry(today, lang)
        val n = catalog.dayNumber(today)
        ensureChannel(context, lang)

        val open = PendingIntent.getActivity(
            context, 0,
            Intent(context, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
                .putExtra(MainActivity.EXTRA_TODAY, true),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        val body = "“${entry.text}”"
        val notification = NotificationCompat.Builder(context, CHANNEL)
            .setSmallIcon(R.drawable.ic_stat_quote)
            .setColor(0xFF000000.toInt())
            .setContentTitle(if (n >= 1) Strings.t(lang, "Day {n}", "n" to n) else Strings.t(lang, "Quote of the day"))
            .setContentText(body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(entry.author?.let { "$body\n— $it" } ?: body))
            .setContentIntent(open)
            .setAutoCancel(true)
            .setCategory(NotificationCompat.CATEGORY_RECOMMENDATION)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .build()
        try {
            NotificationManagerCompat.from(context).notify(NOTIFICATION_ID, notification)
            prefs.edit().putInt(LAST_SHOWN, today).apply()
        } catch (_: SecurityException) {
            // permission revoked between the check and the post
        }
    }
}

/** Fired by the alarm: post the notification, then arm tomorrow's. */
class DailyReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val pending = goAsync()
        val app = context.applicationContext
        thread(name = "daily-quote") {
            try {
                Notifier.show(app)
            } finally {
                Notifier.reschedule(app)
                pending.finish()
            }
        }
    }
}

/** Boot, app update, clock or time-zone change: arm the alarm again. */
class RescheduleReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        Notifier.reschedule(context.applicationContext)
        IconSwitcher.update(context.applicationContext)
    }
}
