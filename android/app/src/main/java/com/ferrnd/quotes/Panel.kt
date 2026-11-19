package com.ferrnd.quotes

import android.content.Intent
import android.os.Build
import android.provider.Settings as AndroidSettings
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.LifecycleResumeEffect

private data class Tab(val title: String, val icon: ImageVector)

private val TABS = listOf(
    Tab("Settings", Icons.Settings),
    Tab("Language", Icons.Language),
    Tab("How it works", Icons.Help),
    Tab("Share", Icons.Share),
    Tab("Favorites", Icons.Heart),
    Tab("Credits", Icons.Credits),
)

/** The gear: settings, language, help, share, favorites and credits, with a rail on the left. */
@Composable
fun Panel(state: AppState) {
    val palette = LocalPalette.current
    var selected by rememberSaveable { mutableIntStateOf(0) }
    val height = LocalConfiguration.current.screenHeightDp.dp * 0.8f

    Sheet(onDismiss = { state.panelOpen = false }) {
        Row(Modifier.height(height)) {
            Column(
                Modifier.fillMaxHeight().padding(start = 10.dp, top = 14.dp, bottom = 14.dp),
                verticalArrangement = Arrangement.spacedBy(4.dp),
            ) {
                TABS.forEachIndexed { i, tab ->
                    Icon(
                        tab.icon,
                        contentDescription = state.t(tab.title),
                        tint = palette.ink,
                        modifier = Modifier
                            .clip(RoundedCornerShape(14.dp))
                            .background(if (i == selected) palette.ink.copy(alpha = 0.07f) else palette.paper)
                            .clickable { selected = i }
                            .padding(12.dp)
                            .size(22.dp)
                            .alpha(if (i == selected) 1f else 0.45f),
                    )
                }
            }
            Column(Modifier.weight(1f)) {
                SheetHeader(state.t(TABS[selected].title), state.t("Close"), close)
                Column(
                    Modifier
                        .fillMaxWidth()
                        .verticalScroll(rememberScrollState())
                        .padding(start = 24.dp, end = 20.dp, top = 8.dp, bottom = 28.dp),
                ) {
                    when (selected) {
                        0 -> SettingsTab(state)
                        1 -> LanguageTab(state)
                        2 -> HelpTab(state)
                        3 -> ShareTab(state)
                        4 -> FavoritesTab(state) { day ->
                            close()
                            state.goTo(day, if (day < state.view) Slide.Right else Slide.Left)
                        }
                        else -> CreditsTab(state)
                    }
                }
            }
        }
    }
}

@Composable
private fun Setting(state: AppState, label: String, key: String, options: List<Pair<String, String>>, note: String? = null) {
    Meta(state.t(label))
    Choices(options.map { (v, l) -> v to state.t(l) }, state.settings.get(key)) { state.update(key, it) }
    if (note != null) Note(state.t(note))
    Gap()
}

@Composable
private fun SettingsTab(state: AppState) {
    val context = LocalContext.current
    var canPost by remember { mutableStateOf(Notifier.canPost(context)) }
    LifecycleResumeEffect(Unit) {
        canPost = Notifier.canPost(context)
        onPauseOrDispose { }
    }
    Setting(state, "Theme", "theme", listOf("auto" to "Auto", "light" to "Light", "dark" to "Dark"),
        "Auto turns the page dark from 9 p.m. to 6 a.m.")
    Setting(state, "Text size", "size", listOf("s" to "Small", "m" to "Medium", "l" to "Large"))
    Setting(state, "Animations", "motion", listOf("on" to "On", "off" to "Off"), "Off swaps quotes instantly, without sliding.")
    Setting(state, "Day counter", "counter", listOf("show" to "Show", "hide" to "Hide"))
    Setting(state, "Copy", "copy", listOf("author" to "With author", "text" to "Quote only"),
        "What a tap on the quote puts on your clipboard.")
    Setting(state, "Search with", "search", listOf("google" to "Google", "duckduckgo" to "DuckDuckGo", "bing" to "Bing"),
        "Used when you tap the author.")
    Setting(state, "Daily notification", "notify", listOf("on" to "notify:on", "off" to "notify:off"),
        "Each day's quote, delivered to your phone.")
    if (state.settings.notify == "on") {
        Meta(state.t("Notify at"))
        Choices(listOf("00", "07", "09", "12", "18", "21").map { it to "$it:00" }, state.settings.notifyAt) { state.update("notifyAt", it) }
        if (!canPost) {
            Note(state.t("Notifications are blocked. Allow them in the phone's settings."))
            Gap(8.dp)
            Pill(state.t("Open settings")) {
                val intent = if (Build.VERSION.SDK_INT >= 26) {
                    Intent(AndroidSettings.ACTION_APP_NOTIFICATION_SETTINGS)
                        .putExtra(AndroidSettings.EXTRA_APP_PACKAGE, context.packageName)
                } else {
                    Intent(AndroidSettings.ACTION_APPLICATION_DETAILS_SETTINGS)
                }
                runCatching { context.startActivity(intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)) }
            }
        }
        Gap()
    }
    Note(state.t("Saved on this device only."))
}

@Composable
private fun LanguageTab(state: AppState) {
    val palette = LocalPalette.current
    val options = listOf("auto" to state.t("Auto")) + state.catalog.languages.map { it.code to it.name }
    Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
        for ((code, name) in options) {
            val on = state.settings.lang == code
            Row(
                Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(12.dp))
                    .background(if (on) palette.ink.copy(alpha = 0.07f) else palette.paper)
                    .clickable { state.update("lang", code) }
                    .padding(horizontal = 14.dp, vertical = 11.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Body(name, Modifier.weight(1f), size = 20.sp)
                if (on) Body("✓", size = 20.sp)
            }
        }
    }
    Gap(16.dp)
    Note(state.t("Auto follows the language of your phone."))
    Note(state.t("Every quote is translated by hand, to carry its meaning rather than its words."))
}

@Composable
private fun Section(state: AppState, title: String, text: String) {
    Meta(state.t(title))
    Body(state.t(text), Modifier.padding(top = 6.dp), size = 18.sp)
    Gap()
}

@Composable
private fun HelpTab(state: AppState) {
    Section(state, "One quote a day",
        "A new quote about overcoming appears every day at midnight, in your own time zone. The old one drops away and the new one comes down from above.")
    Section(state, "Copy", "Tap the quote to copy it, together with its author. You can copy the quote alone in Settings.")
    Section(state, "Search", "Tap the author to look them up on the web. Pick the search engine in Settings.")
    Section(state, "Favorites",
        "Long-press the quote to save it as a favorite; do it again to remove it. The Favorites tab lists them all and takes you back to their day.")
    Section(state, "Past days", "Swipe left and right to walk back through every day since Day 1.")
    Section(state, "The day counter",
        "The number in the corner counts the days since the first one. Tap it to read every quote so far, and to see how long until the next.")
    Section(state, "Notifications",
        "Every day, at the time you choose in Settings, the day's quote arrives as a notification, in your language.")
    Section(state, "Night",
        "From 9 p.m. to 6 a.m. the screen turns white on black, and back again in the morning. Settings can keep it light or dark all the time.")
    Section(state, "Offline", "Everything works offline: every quote, in every language, lives inside the app.")
    Note(state.t("{q} quotes by {a} authors", "q" to state.catalog.size, "a" to state.catalog.authorCount))
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun ShareTab(state: AppState) {
    val context = LocalContext.current
    val clipboard = LocalClipboardManager.current
    val palette = LocalPalette.current
    val entry = state.entry(state.view)
    val label = if (state.catalog.dayNumber(state.view) >= 1) state.dayLabel(state.view) else null
    val fileName = "${(label ?: "quote").lowercase().replace(' ', '-')}.png"
    fun card() = Share.renderCard(context, entry, label, palette, state.lang)

    Body(state.t("Send the quote on screen, as a picture or as text, with a link to the site."), size = 18.sp)
    Gap(16.dp)
    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Pill(state.t("Share image")) {
            runCatching { Share.shareImage(context, card(), fileName, Share.quoteText(entry), state.t("Share")) }
                .onFailure { state.show(state.t("Could not share")) }
        }
        Pill(state.t("Share text")) {
            Share.shareText(context, "${Share.quoteText(entry)}\n\n$PUBLIC_URL", state.t("Share"))
        }
        Pill(state.t("Save image")) {
            val ok = runCatching { Share.saveImage(context, card(), fileName) }.getOrDefault(false)
            if (ok) state.show(state.t("Image saved"))
            else runCatching { Share.shareImage(context, card(), fileName, Share.quoteText(entry), state.t("Share")) }
        }
        Pill(state.t("Copy link")) {
            clipboard.setText(AnnotatedString(PUBLIC_URL))
            state.show(state.t("Link copied"))
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun FavoritesTab(state: AppState, onShow: (Int) -> Unit) {
    val context = LocalContext.current
    if (state.favorites.isEmpty()) {
        Body(state.t("No favorites yet."), size = 20.sp, italic = !state.upright)
        Note(state.t("Long-press the quote to save it here. Do it again to remove it."))
        return
    }
    for (day in state.favorites) {
        val entry = state.entry(day)
        val n = state.catalog.dayNumber(day)
        Meta(if (n >= 1) "${state.dayLabel(day)} · ${formatDate(day, state.lang)}" else formatDate(day, state.lang))
        Body("“${entry.text}”", Modifier.padding(top = 6.dp), italic = !state.upright, size = 20.sp)
        entry.author?.let { Meta(it, Modifier.padding(top = 6.dp)) }
        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(top = 10.dp)) {
            Pill(state.t("Show")) { onShow(day) }
            Pill(state.t("Remove")) { state.toggleFavorite(day) }
        }
        Gap()
    }
    Pill(state.t("Share all")) {
        val text = buildString {
            append(state.t("My favorite quotes")).append("\n\n")
            for (day in state.favorites) {
                val entry = state.entry(day)
                val n = state.catalog.dayNumber(day)
                append(if (n >= 1) "${state.dayLabel(day)} · ${formatDate(day, state.lang)}" else formatDate(day, state.lang)).append('\n')
                append(Share.quoteText(entry)).append("\n\n")
            }
            append(PUBLIC_URL)
        }
        Share.shareText(context, text, state.t("Share"))
    }
}

@Composable
private fun CreditsTab(state: AppState) {
    val context = LocalContext.current
    @Composable
    fun row(label: String, value: String, url: String? = null) {
        Meta(state.t(label))
        Body(value, Modifier.padding(top = 4.dp).let { if (url != null) it.clickable { Share.open(context, url) } else it }, size = 19.sp)
        Gap(18.dp)
    }
    row("Made by", "ferrnd", "https://github.com/ferrnd")
    row("Typeset in", state.t("Cormorant Garamond, by Christian Thalmann"))
    row("Engine", state.t("Native Android, in Kotlin and Jetpack Compose"))
    row("Words", state.t("Every quote belongs to its author"))
    row("Source", "github.com/ferrnd/quotes", "https://github.com/ferrnd/quotes")
    Note(state.t("© 2026 · Since Day 1"))
}
