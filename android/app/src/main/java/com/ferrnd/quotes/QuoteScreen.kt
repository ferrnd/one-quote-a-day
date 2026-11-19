package com.ferrnd.quotes

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.ContentTransform
import androidx.compose.animation.EnterTransition
import androidx.compose.animation.ExitTransition
import androidx.compose.animation.SizeTransform
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.animation.slideOutVertically
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.gestures.detectHorizontalDragGestures
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.LineBreak
import androidx.compose.ui.text.style.LineHeightStyle
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.em
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.delay
import java.util.Locale

private val Edge = 32.dp

@Composable
fun QuoteScreen(state: AppState) {
    val palette = LocalPalette.current
    val density = LocalDensity.current
    val swipe = with(density) { 48.dp.toPx() }

    Box(
        Modifier
            .fillMaxSize()
            .background(palette.paper)
            .pointerInput(Unit) {
                var dx = 0f
                detectHorizontalDragGestures(
                    onDragStart = { dx = 0f },
                    onDragEnd = {
                        if (dx <= -swipe) state.step(1) else if (dx >= swipe) state.step(-1)
                    },
                    onHorizontalDrag = { change, amount -> dx += amount; change.consume() },
                )
            }
            .safeDrawingPadding(),
    ) {
        Quote(state, Modifier.align(Alignment.Center))
        Corner(state, Modifier.align(Alignment.BottomEnd).padding(end = Edge, bottom = Edge))
        Toast(state, Modifier.align(Alignment.TopCenter).padding(top = Edge))
    }
}

@Composable
private fun Quote(state: AppState, modifier: Modifier) {
    val screenHeight = with(LocalDensity.current) { LocalConfiguration.current.screenHeightDp.dp.roundToPx() }
    AnimatedContent(
        targetState = state.view,
        transitionSpec = { slideFor(state.slide, screenHeight) },
        contentAlignment = Alignment.Center,
        modifier = modifier.fillMaxWidth(),
        label = "quote",
    ) { day ->
        QuoteBlock(state, day)
    }
}

private fun slideFor(slide: Slide, screenHeight: Int): ContentTransform {
    val move = tween<androidx.compose.ui.unit.IntOffset>(650, easing = FastOutSlowInEasing)
    val fade = tween<Float>(500)
    val spec = when (slide) {
        Slide.None -> EnterTransition.None togetherWith ExitTransition.None
        // forward in time: the old quote leaves to the left, the new one comes from the right
        Slide.Left -> (slideInHorizontally(move) { it } + fadeIn(fade)) togetherWith
            (slideOutHorizontally(move) { -it } + fadeOut(fade))
        Slide.Right -> (slideInHorizontally(move) { -it } + fadeIn(fade)) togetherWith
            (slideOutHorizontally(move) { it } + fadeOut(fade))
        // midnight: the old quote drops to the bottom, the new one comes down from the top
        Slide.Down -> (slideInVertically(tween(900, easing = FastOutSlowInEasing)) { -screenHeight } + fadeIn(tween(900))) togetherWith
            (slideOutVertically(tween(900, easing = FastOutSlowInEasing)) { screenHeight } + fadeOut(tween(900)))
    }
    return ContentTransform(spec.targetContentEnter, spec.initialContentExit, sizeTransform = SizeTransform(clip = false))
}

@OptIn(ExperimentalFoundationApi::class)
@Composable
private fun QuoteBlock(state: AppState, day: Int) {
    val palette = LocalPalette.current
    val fonts = LocalFonts.current
    val context = LocalContext.current
    val clipboard = LocalClipboardManager.current
    val haptics = LocalHapticFeedback.current
    val entry = state.entry(day)
    val locale = Locale.forLanguageTag(state.lang)

    // the site's clamp(): grows a little on wider screens
    val width = LocalConfiguration.current.screenWidthDp
    val scale = (width / 375f).coerceIn(1f, 1.7f)
    val base = when (state.settings.size) { "s" -> 24f; "l" -> 32f; else -> 28f }

    BoxWithConstraints(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
            modifier = Modifier
                .widthIn(max = 640.dp)
                .padding(horizontal = Edge, vertical = 96.dp)
                .verticalScroll(rememberScrollState()),
        ) {
            Text(
                text = "“${entry.text}”",
                color = palette.ink,
                textAlign = TextAlign.Center,
                style = TextStyle(
                    fontFamily = fonts.serif,
                    fontStyle = if (state.upright) FontStyle.Normal else FontStyle.Italic,
                    fontWeight = FontWeight.Medium,
                    fontSize = (base * scale).sp,
                    lineHeight = 1.22.em,
                    letterSpacing = 0.002.em,
                    lineBreak = LineBreak.Heading,
                    lineHeightStyle = LineHeightStyle(LineHeightStyle.Alignment.Center, LineHeightStyle.Trim.Both),
                ),
                modifier = Modifier.combinedClickable(
                    interactionSource = remember { MutableInteractionSource() },
                    indication = null,
                    role = Role.Button,
                    onClick = {
                        val text = if (state.settings.copy == "text") "“${entry.text}”" else Share.quoteText(entry)
                        clipboard.setText(AnnotatedString(text))
                        state.show(state.t("Copied"))
                    },
                    onLongClick = {
                        haptics.performHapticFeedback(HapticFeedbackType.LongPress)
                        state.toggleFavorite(day)
                    },
                ),
            )
            entry.author?.let { author ->
                Spacer(Modifier.height(26.dp))
                Box(Modifier.width(40.dp).height(1.dp).background(palette.ink))
                Spacer(Modifier.height(20.dp))
                Text(
                    text = author.uppercase(locale),
                    color = palette.ink,
                    textAlign = TextAlign.Center,
                    style = TextStyle(
                        fontFamily = fonts.serif,
                        fontWeight = FontWeight.SemiBold,
                        fontSize = (13.5f * scale).sp,
                        letterSpacing = 0.28.em,
                    ),
                    modifier = Modifier
                        .padding(start = (13.5f * scale * 0.28f).dp) // the trailing letter space, so it stays centred
                        .combinedClickable(
                            interactionSource = remember { MutableInteractionSource() },
                            indication = null,
                            role = Role.Button,
                            onClick = { Share.search(context, state.settings.search, author) },
                        ),
                )
            }
            if (day in state.favorites) {
                Spacer(Modifier.height(22.dp))
                Icon(Icons.HeartFilled, contentDescription = state.t("Favorites"), tint = palette.ink,
                    modifier = Modifier.size(14.dp).alpha(0.35f))
            }
        }
    }
}

/** Bottom-right corner: [gear] DAY 2, the same square gap to both edges. */
@OptIn(ExperimentalFoundationApi::class)
@Composable
private fun Corner(state: AppState, modifier: Modifier) {
    val palette = LocalPalette.current
    val fonts = LocalFonts.current
    val showCounter = state.settings.counter != "hide" && state.catalog.dayNumber(state.today) >= 1
    Row(modifier, verticalAlignment = Alignment.CenterVertically) {
        Icon(
            Icons.Settings,
            contentDescription = state.t("Settings"),
            tint = palette.ink,
            modifier = Modifier
                .alpha(0.5f)
                .combinedClickable(
                    interactionSource = remember { MutableInteractionSource() },
                    indication = null,
                    role = Role.Button,
                    onClick = { state.panelOpen = true },
                )
                .padding(6.dp)
                .size(20.dp),
        )
        if (showCounter) {
            Spacer(Modifier.width(4.dp))
            Text(
                text = state.dayLabel(state.view).uppercase(Locale.forLanguageTag(state.lang)),
                color = palette.ink,
                style = TextStyle(
                    fontFamily = fonts.serif,
                    fontWeight = FontWeight.Bold,
                    fontSize = 17.6.sp,
                    letterSpacing = 0.16.em,
                    fontFeatureSettings = "lnum",
                ),
                modifier = Modifier
                    .alpha(0.5f)
                    .combinedClickable(
                        interactionSource = remember { MutableInteractionSource() },
                        indication = null,
                        role = Role.Button,
                        onClick = { state.archiveOpen = true },
                    )
                    .padding(vertical = 6.dp),
            )
        }
    }
}

@Composable
private fun Toast(state: AppState, modifier: Modifier) {
    val palette = LocalPalette.current
    val fonts = LocalFonts.current
    var visible by remember { mutableStateOf(false) }
    LaunchedEffect(state.toastSerial) {
        if (state.toastSerial == 0) return@LaunchedEffect
        visible = true
        delay(1600)
        visible = false
    }
    AnimatedVisibility(visible, modifier, enter = fadeIn(tween(300)), exit = fadeOut(tween(300))) {
        Text(
            text = (state.toast ?: "").uppercase(Locale.forLanguageTag(state.lang)),
            color = palette.ink,
            style = TextStyle(
                fontFamily = fonts.serif,
                fontWeight = FontWeight.Bold,
                fontSize = 15.sp,
                letterSpacing = 0.16.em,
            ),
            modifier = Modifier.alpha(0.55f),
        )
    }
}
