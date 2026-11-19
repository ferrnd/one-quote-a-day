package com.ferrnd.quotes

import android.Manifest
import android.app.AlarmManager
import android.app.Application
import android.app.NotificationManager
import android.graphics.Bitmap
import androidx.compose.ui.test.ExperimentalTestApi
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.longClick
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performScrollTo
import androidx.compose.ui.test.performTouchInput
import androidx.compose.ui.test.swipeLeft
import androidx.compose.ui.test.swipeRight
import androidx.core.app.NotificationCompat
import androidx.test.core.app.ApplicationProvider
import com.github.takahirom.roborazzi.ExperimentalRoborazziApi
import com.github.takahirom.roborazzi.RobolectricDeviceQualifiers
import com.github.takahirom.roborazzi.captureScreenRoboImage
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.Shadows.shadowOf
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode
import java.io.File
import java.time.LocalDate

/**
 * Drives the real app on the JVM: every gesture and every tab, with a
 * screenshot of each state in build/screens/ for a human to look at.
 */
@OptIn(ExperimentalRoborazziApi::class, ExperimentalTestApi::class)
@RunWith(RobolectricTestRunner::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(sdk = [34], qualifiers = RobolectricDeviceQualifiers.Pixel7)
class AppTest {

    @get:Rule
    val compose = createAndroidComposeRule<MainActivity>()

    private val today = LocalDate.now().toEpochDay().toInt()
    private val catalog by lazy { Catalog.get(ApplicationProvider.getApplicationContext()) }
    private fun counter(day: Int, word: String = "DAY") = "$word ${catalog.dayNumber(day)}"
    private fun shot(name: String) = captureScreenRoboImage("build/screens/$name.png")

    private fun waitForText(text: String, substring: Boolean = false) =
        compose.waitUntil(10_000) { compose.onAllNodesWithText(text, substring = substring).fetchSemanticsNodes().isNotEmpty() }

    @Test
    fun walksThroughTheWholeApp() {
        waitForText(counter(today))
        val entry = catalog.entry(today, "en")
        compose.onNodeWithText("“${entry.text}”").assertExistsCompat()
        shot("01-today")

        // tap copies, long-press favorites
        compose.onNodeWithText("“${entry.text}”").performClick()
        waitForText("COPIED")
        compose.onNodeWithText("“${entry.text}”").performTouchInput { longClick() }
        waitForText("ADDED TO FAVORITES")
        compose.onNodeWithContentDescription("Favorites").assertExistsCompat()
        shot("02-favorited")

        // swipe right goes back a day, swipe left comes back, never past today
        compose.onNodeWithText("“${entry.text}”").performTouchInput { swipeRight() }
        waitForText(counter(today - 1))
        shot("03-yesterday")
        val yesterday = catalog.entry(today - 1, "en")
        compose.onNodeWithText("“${yesterday.text}”").performTouchInput { swipeLeft() }
        waitForText(counter(today))
        compose.onNodeWithText("“${entry.text}”").performTouchInput { swipeLeft() }
        compose.waitForIdle()
        waitForText(counter(today))

        shot("03b-back-today")

        // the archive
        compose.onNodeWithText(counter(today)).performClick()
        waitForText("Every day so far")
        shot("04-archive")
        compose.onNodeWithContentDescription("Close").performClick()
        compose.waitUntil(5_000) { compose.onAllNodesWithText("Every day so far").fetchSemanticsNodes().isEmpty() }
        compose.waitForIdle()
        shot("04b-archive-closed")

        // every tab of the panel
        compose.onNodeWithContentDescription("Settings").performClick()
        waitForText("TEXT SIZE")
        shot("05-settings")
        for ((i, tab) in listOf("Language", "How it works", "Share", "Favorites", "Credits").withIndex()) {
            compose.onAllNodesWithContentDescriptionCompat(tab).last().performClick()
            compose.waitForIdle()
            shot("06-${i + 1}-${tab.lowercase().replace(' ', '-')}")
        }

        // Portuguese, then the dark theme
        compose.onAllNodesWithContentDescriptionCompat("Language").last().performClick()
        compose.onNodeWithText("Português (Brasil)").performClick()
        waitForText("Idioma")
        compose.onAllNodesWithContentDescriptionCompat("Configurações").last().performClick()
        waitForText("Escuro")
        compose.onNodeWithText("Escuro").performClick()
        compose.waitForIdle()
        shot("07-settings-pt-dark")
        compose.onNodeWithContentDescription("Fechar").performClick()
        waitForText(counter(today, "DIA"))
        compose.mainClock.advanceTimeBy(2_000)
        shot("08-today-pt-dark")
        val pt = catalog.entry(today, "pt-BR")
        compose.onNodeWithText("“${pt.text}”").assertExistsCompat()
    }

    @Test
    fun postsTheDailyNotificationAndArmsTheNextOne() {
        val app = ApplicationProvider.getApplicationContext<Application>()
        shadowOf(app).grantPermissions(Manifest.permission.POST_NOTIFICATIONS)
        Prefs(app).save(Settings(lang = "pt-BR", notifyAt = "07"))

        Notifier.show(app)
        val nm = app.getSystemService(NotificationManager::class.java)
        val posted = shadowOf(nm).allNotifications
        assertEquals(1, posted.size)
        val extras = posted[0].extras
        assertEquals("Dia ${catalog.dayNumber(today)}", extras.getString(NotificationCompat.EXTRA_TITLE))
        assertEquals("“${catalog.entry(today, "pt-BR").text}”", extras.getCharSequence(NotificationCompat.EXTRA_TEXT).toString())

        Notifier.show(app) // once per day only
        assertEquals(1, shadowOf(nm).allNotifications.size)

        Notifier.reschedule(app)
        val alarm = shadowOf(app.getSystemService(AlarmManager::class.java)).nextScheduledAlarm
        assertNotNull(alarm)
        val at = java.time.Instant.ofEpochMilli(alarm!!.triggerAtTime).atZone(java.time.ZoneId.systemDefault())
        assertEquals(7, at.hour)
        assertTrue(at.toInstant().isAfter(java.time.Instant.now()))

        Prefs(app).save(Settings(notify = "off"))
        Notifier.reschedule(app)
        assertEquals(null, shadowOf(app.getSystemService(AlarmManager::class.java)).nextScheduledAlarm)
    }

    @Test
    fun theLauncherIconFollowsTheTheme() {
        val app = ApplicationProvider.getApplicationContext<Application>()
        val zone = java.time.ZoneId.systemDefault()
        val night = java.time.LocalDate.of(2026, 11, 18).atTime(22, 30).atZone(zone)
        val day = java.time.LocalDate.of(2026, 11, 18).atTime(10, 0).atZone(zone)

        fun iconAt(theme: String, now: java.time.ZonedDateTime): Boolean {
            Prefs(app).save(Settings(theme = theme))
            IconSwitcher.update(app, now)
            return IconSwitcher.showingNight(app)
        }
        // Auto: black icon from 21:00 to 06:00, white otherwise
        assertTrue(iconAt("auto", night))
        assertEquals(false, iconAt("auto", day))
        // fixed themes ignore the clock
        assertTrue(iconAt("dark", day))
        assertEquals(false, iconAt("light", night))

        // the next swap is the next 06:00 or 21:00
        assertEquals(6, IconSwitcher.nextSwap(night).hour)
        assertEquals(19, IconSwitcher.nextSwap(night).dayOfMonth)
        assertEquals(21, IconSwitcher.nextSwap(day).hour)
        assertEquals(18, IconSwitcher.nextSwap(day).dayOfMonth)

        // exactly one launcher entry at any time
        val pm = app.packageManager
        val launchers = pm.queryIntentActivities(
            android.content.Intent(android.content.Intent.ACTION_MAIN).addCategory(android.content.Intent.CATEGORY_LAUNCHER)
                .setPackage(app.packageName), 0,
        )
        assertEquals(1, launchers.size)
    }

    @Test
    fun rendersTheShareCard() {
        val app = ApplicationProvider.getApplicationContext<Application>()
        for ((name, lang) in listOf("en" to "en", "de" to "de")) {
            val entry = catalog.entry(today, lang)
            val bitmap = Share.renderCard(app, entry, Strings.t(lang, "Day {n}", "n" to catalog.dayNumber(today)), Palette.Day, lang)
            assertEquals(1080, bitmap.width)
            File("build/screens").mkdirs()
            File("build/screens/card-$name.png").outputStream().use { bitmap.compress(Bitmap.CompressFormat.PNG, 100, it) }
        }
        val dedication = catalog.entry(catalog.launch, "en")
        assertEquals(null, dedication.author)
        val bitmap = Share.renderCard(app, dedication, "Day 1", Palette.Day, "en")
        File("build/screens/card-day1.png").outputStream().use { bitmap.compress(Bitmap.CompressFormat.PNG, 100, it) }
    }

    // small helpers, so the test reads as a story
    private fun androidx.compose.ui.test.SemanticsNodeInteraction.assertExistsCompat() = assertExists()
    private fun androidx.compose.ui.test.junit4.ComposeTestRule.onAllNodesWithContentDescriptionCompat(label: String) =
        onAllNodes(androidx.compose.ui.test.hasContentDescription(label)).fetchSemanticsNodes().let { nodes ->
            List(nodes.size) { i -> onAllNodes(androidx.compose.ui.test.hasContentDescription(label))[i] }
        }
}
