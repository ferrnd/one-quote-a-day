package com.ferrnd.quotes

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.delay
import java.time.Duration
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter
import java.time.format.FormatStyle
import java.util.Locale

fun formatDate(day: Int, lang: String): String =
    LocalDate.ofEpochDay(day.toLong())
        .format(DateTimeFormatter.ofLocalizedDate(FormatStyle.LONG).withLocale(Locale.forLanguageTag(lang)))

/** hh:mm:ss until the next local midnight. */
fun countdown(): String {
    val now = LocalDateTime.now()
    val left = Duration.between(now, now.toLocalDate().plusDays(1).atStartOfDay()).seconds.coerceAtLeast(0)
    return "%02d:%02d:%02d".format(left / 3600, left / 60 % 60, left % 60)
}

/** Every day so far, newest first. Lazy, so DAY 18000 opens as fast as DAY 2. */
@Composable
fun Archive(state: AppState) {
    var next by remember { mutableStateOf(countdown()) }
    LaunchedEffect(Unit) {
        while (true) {
            next = countdown()
            delay(1000)
        }
    }
    val height = LocalConfiguration.current.screenHeightDp.dp
    Sheet(onDismiss = { state.archiveOpen = false }) {
        Column {
            SheetHeader(state.t("Every day so far"), state.t("Close"), close, subtitle = state.t("Next in {t}", "t" to next))
            LazyColumn(Modifier.fillMaxWidth().heightIn(max = height * 0.72f)) {
                items(state.today - state.first + 1, key = { state.today - it }) { i ->
                    val day = state.today - i
                    val entry = state.entry(day)
                    Column(
                        Modifier
                            .fillMaxWidth()
                            .clickable {
                                close()
                                state.goTo(day, if (day < state.view) Slide.Right else Slide.Left)
                            }
                            .padding(horizontal = 24.dp, vertical = 14.dp),
                    ) {
                        val n = state.catalog.dayNumber(day)
                        Meta(if (n >= 1) "${state.dayLabel(day)} · ${formatDate(day, state.lang)}" else formatDate(day, state.lang))
                        Body("“${entry.text}”", Modifier.padding(top = 6.dp), italic = true, size = 19.sp)
                        entry.author?.let { Meta(it, Modifier.padding(top = 6.dp)) }
                    }
                }
            }
        }
    }
}
