package com.ferrnd.quotes

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class ScheduleTest {

    private val golden: List<String> =
        javaClass.classLoader!!.getResource("golden.txt")!!.readText().lines().filter { it.isNotBlank() }

    private val header = Regex("""n=(\d+) legacy=(\d+) launch=(-?\d+)""").find(golden.first())!!.groupValues
    private val calendar = Calendar(header[1].toInt(), header[2].toInt(), header[3].toInt())

    @Test
    fun matchesThePythonReference() {
        var checked = 0
        for (line in golden.drop(1)) {
            val (day, entry) = line.split(" ").map { it.toInt() }
            if (entry >= calendar.n) continue // a dedication is pinned to that day
            assertEquals("day $day", entry, calendar.quoteForDay(day))
            checked++
        }
        assertTrue("too few days checked: $checked", checked > 1000)
    }

    @Test
    fun neverRepeatsAQuoteOnConsecutiveDays() {
        val start = calendar.launch
        for (day in start until start + 5 * calendar.n) {
            assertNotEquals("day $day", calendar.quoteForDay(day), calendar.quoteForDay(day + 1))
        }
    }

    @Test
    fun civilRoundTrips() {
        for (z in -800_000..800_000 step 37) {
            val d = Civil.civilFromDays(z)
            assertEquals(z, Civil.daysFromCivil(d.year, d.month, d.day))
        }
        assertEquals(0, Civil.daysFromCivil(1970, 1, 1))
        assertEquals(Civil.Date(2026, 11, 16), Civil.civilFromDays(calendar.launch))
    }

    @Test
    fun pcg32MatchesTheReferenceStream() {
        // O'Neill's pcg32-demo, seeded with (42, 54)
        val rng = Pcg32(42, 54)
        val expected = longArrayOf(0xa15c02b7, 0x7b47f409, 0xba1d3330, 0x83d2f293, 0xbfa4784b, 0xcbed606e)
        for (value in expected) assertEquals(value, rng.nextU32())
    }
}
