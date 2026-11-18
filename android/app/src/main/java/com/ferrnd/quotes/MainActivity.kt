package com.ferrnd.quotes

import android.Manifest
import android.content.Intent
import android.graphics.Color as AndroidColor
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.SystemBarStyle
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.tween
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.produceState
import androidx.compose.runtime.remember
import androidx.compose.ui.graphics.Color
import androidx.lifecycle.compose.LifecycleResumeEffect
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.withContext

class MainActivity : ComponentActivity() {

    /** Set when a notification opened the app: show today's quote. */
    private val openToday = mutableStateOf(0)

    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
        if (intent?.getBooleanExtra(EXTRA_TODAY, false) == true) openToday.value++
        val fonts = Fonts(assets)
        setContent {
            val catalog by produceState<Catalog?>(null) {
                value = withContext(Dispatchers.IO) { Catalog.get(applicationContext) }
            }
            CompositionLocalProvider(LocalFonts provides fonts) {
                catalog?.let { App(it) }
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        if (intent.getBooleanExtra(EXTRA_TODAY, false)) openToday.value++
    }

    @Composable
    private fun App(catalog: Catalog) {
        val state = remember { AppState(applicationContext, catalog) }

        // the clock: midnight, the night theme, and coming back from the background
        LaunchedEffect(Unit) {
            while (true) {
                state.tick()
                delay(5_000)
            }
        }
        LifecycleResumeEffect(Unit) {
            state.tick()
            onPauseOrDispose { }
        }
        LaunchedEffect(openToday.value) { if (openToday.value > 0) state.goToday() }

        // notifications: ask once, then keep the alarm armed
        val askPermission = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) {
            Notifier.reschedule(applicationContext)
        }
        LaunchedEffect(state.settings.notify) {
            Notifier.ensureChannel(applicationContext, state.lang)
            Notifier.reschedule(applicationContext)
            if (state.settings.notify == "on" && Build.VERSION.SDK_INT >= 33 && !Notifier.canPost(applicationContext)) {
                askPermission.launch(Manifest.permission.POST_NOTIFICATIONS)
            }
        }

        val night = state.night
        LaunchedEffect(night) {
            val bars = if (night) SystemBarStyle.dark(AndroidColor.TRANSPARENT)
            else SystemBarStyle.light(AndroidColor.TRANSPARENT, AndroidColor.TRANSPARENT)
            enableEdgeToEdge(statusBarStyle = bars, navigationBarStyle = bars)
        }
        val ink by animateColorAsState(if (night) Color.White else Color.Black, tween(1600), label = "ink")
        val paper by animateColorAsState(if (night) Color.Black else Color.White, tween(1600), label = "paper")

        CompositionLocalProvider(LocalPalette provides Palette(ink, paper, night)) {
            QuoteScreen(state)
            if (state.archiveOpen) Archive(state)
            if (state.panelOpen) Panel(state)
        }
    }

    companion object {
        const val EXTRA_TODAY = "today"
    }
}
