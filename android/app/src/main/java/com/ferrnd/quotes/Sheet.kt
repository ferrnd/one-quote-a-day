package com.ferrnd.quotes

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.em
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.compose.ui.window.DialogWindowProvider
import androidx.compose.ui.platform.LocalView
import androidx.compose.runtime.SideEffect
import kotlinx.coroutines.launch

/** Closes a sheet with its exit animation first. */
class SheetScope(val close: () -> Unit)

/**
 * The site's modal: a rounded card on a veil of paper, no strokes, sliding up
 * as it opens and back down as it closes.
 */
@Composable
fun Sheet(onDismiss: () -> Unit, content: @Composable SheetScope.() -> Unit) {
    val palette = LocalPalette.current
    val progress = remember { Animatable(0f) }
    val scope = rememberCoroutineScope()
    LaunchedEffect(Unit) { progress.animateTo(1f, tween(320, easing = FastOutSlowInEasing)) }
    val close: () -> Unit = {
        scope.launch {
            progress.animateTo(0f, tween(220, easing = FastOutSlowInEasing))
            onDismiss()
        }
    }
    Dialog(
        onDismissRequest = close,
        properties = DialogProperties(usePlatformDefaultWidth = false, decorFitsSystemWindows = false),
    ) {
        // no system dim: the veil below is paper-coloured, as on the site
        val window = (LocalView.current.parent as? DialogWindowProvider)?.window
        SideEffect { window?.setDimAmount(0f) }
        Box(
            Modifier
                .fillMaxSize()
                .graphicsLayer { alpha = progress.value }
                .background(palette.paper.copy(alpha = 0.72f))
                .clickable(remember { MutableInteractionSource() }, indication = null, onClick = close)
                .safeDrawingPadding()
                .padding(horizontal = 16.dp, vertical = 24.dp),
            contentAlignment = Alignment.Center,
        ) {
            Box(
                Modifier
                    .widthIn(max = 640.dp)
                    .fillMaxWidth()
                    .graphicsLayer {
                        translationY = (1f - progress.value) * 24.dp.toPx()
                        scaleX = 0.98f + 0.02f * progress.value
                        scaleY = scaleX
                    }
                    .shadow(if (palette.night) 0.dp else 28.dp, RoundedCornerShape(22.dp), clip = false)
                    .clip(RoundedCornerShape(22.dp))
                    .background(palette.paper)
                    .clickable(remember { MutableInteractionSource() }, indication = null) { },
            ) {
                SheetScope(close).content()
            }
        }
    }
}

@Composable
fun SheetHeader(title: String, closeLabel: String, onClose: () -> Unit, subtitle: String? = null) {
    val palette = LocalPalette.current
    val fonts = LocalFonts.current
    Row(
        Modifier.fillMaxWidth().padding(start = 24.dp, end = 12.dp, top = 18.dp, bottom = 6.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(Modifier.weight(1f)) {
            Text(title, color = palette.ink, style = TextStyle(fontFamily = fonts.serif, fontWeight = FontWeight.SemiBold, fontSize = 24.sp))
            if (subtitle != null) Meta(subtitle)
        }
        Icon(
            Icons.Close, contentDescription = closeLabel, tint = palette.ink,
            modifier = Modifier
                .clip(RoundedCornerShape(50))
                .clickable(onClick = onClose)
                .padding(12.dp)
                .size(18.dp)
                .alpha(0.6f),
        )
    }
}

/** Small capitals in faded ink: labels, dates, the day number. */
@Composable
fun Meta(text: String, modifier: Modifier = Modifier) {
    val palette = LocalPalette.current
    Text(
        text.uppercase(),
        color = palette.ink,
        modifier = modifier.alpha(0.5f),
        style = TextStyle(fontFamily = LocalFonts.current.serif, fontWeight = FontWeight.Bold, fontSize = 12.5.sp,
            letterSpacing = 0.16.em, fontFeatureSettings = "lnum"),
    )
}

@Composable
fun Body(text: String, modifier: Modifier = Modifier, italic: Boolean = false, size: TextUnit = 18.sp, alpha: Float = 1f) {
    Text(
        text,
        color = LocalPalette.current.ink,
        modifier = modifier.alpha(alpha),
        style = TextStyle(
            fontFamily = LocalFonts.current.serif,
            fontStyle = if (italic) FontStyle.Italic else FontStyle.Normal,
            fontSize = size,
            lineHeight = 1.3.em,
        ),
    )
}

@Composable
fun Note(text: String, modifier: Modifier = Modifier) = Body(text, modifier.padding(top = 6.dp), size = 15.sp, alpha = 0.6f)

/** A pill button; filled when selected. */
@Composable
fun Pill(label: String, selected: Boolean = false, onClick: () -> Unit) {
    val palette = LocalPalette.current
    Text(
        label,
        color = if (selected) palette.paper else palette.ink,
        style = TextStyle(fontFamily = LocalFonts.current.serif, fontWeight = FontWeight.SemiBold, fontSize = 16.sp),
        modifier = Modifier
            .clip(RoundedCornerShape(50))
            .background(if (selected) palette.ink else palette.ink.copy(alpha = 0.06f))
            .clickable(onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 8.dp),
    )
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun Choices(options: List<Pair<String, String>>, selected: String, onSelect: (String) -> Unit) {
    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp),
        modifier = Modifier.padding(top = 10.dp)) {
        for ((value, label) in options) Pill(label, value == selected) { onSelect(value) }
    }
}

@Composable
fun Gap(height: Dp = 22.dp) = Spacer(Modifier.height(height))
