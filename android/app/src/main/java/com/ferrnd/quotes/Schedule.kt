package com.ferrnd.quotes

/*
 * The daily schedule, ported from tools/qotd (Python) and src/wat (WebAssembly).
 * Every function here must agree with them bit for bit: the unit test replays
 * a golden file written by the Python reference.
 */

/** Proleptic Gregorian calendar arithmetic (Howard Hinnant). Day 0 is 1970-01-01. */
object Civil {
    const val DAYS_PER_ERA = 146_097

    fun daysFromCivil(year: Int, month: Int, day: Int): Int {
        val y = if (month <= 2) year - 1 else year
        val era = (if (y >= 0) y else y - 399) / 400
        val yoe = y - era * 400
        val mp = if (month > 2) month - 3 else month + 9
        val doy = (153 * mp + 2) / 5 + day - 1
        val doe = yoe * 365 + yoe / 4 - yoe / 100 + doy
        return era * DAYS_PER_ERA + doe - 719_468
    }

    data class Date(val year: Int, val month: Int, val day: Int)

    fun civilFromDays(days: Int): Date {
        val z = days + 719_468
        val era = (if (z >= 0) z else z - 146_096) / DAYS_PER_ERA
        val doe = z - era * DAYS_PER_ERA
        val yoe = (doe - doe / 1460 + doe / 36_524 - doe / 146_096) / 365
        val y = yoe + era * 400
        val doy = doe - (365 * yoe + yoe / 4 - yoe / 100)
        val mp = (5 * doy + 2) / 153
        val d = doy - (153 * mp + 2) / 5 + 1
        val m = if (mp < 10) mp + 3 else mp - 9
        return Date(if (m <= 2) y + 1 else y, m, d)
    }
}

/** PCG32 (XSH RR 64/32). Kotlin's Long arithmetic wraps mod 2^64, as the algorithm needs. */
class Pcg32(initState: Long, initSeq: Long) {
    private var state = 0L
    private val inc = (initSeq shl 1) or 1L

    init {
        nextU32()
        state += initState
        nextU32()
    }

    /** The next 32-bit output, as a non-negative Long. */
    fun nextU32(): Long {
        val old = state
        state = old * MULTIPLIER + inc
        val xorshifted = (((old ushr 18) xor old) ushr 27) and MASK32
        val rot = (old ushr 59).toInt()
        return ((xorshifted ushr rot) or (xorshifted shl ((-rot) and 31))) and MASK32
    }

    /** Map an output into [0, bound) with a multiply-shift. */
    fun bounded(bound: Int): Int {
        require(bound > 0) { "bound out of range: $bound" }
        return ((nextU32() * bound) ushr 32).toInt()
    }

    companion object {
        const val MASK32 = 0xFFFF_FFFFL
        const val MULTIPLIER = 6364136223846793005L
    }
}

/**
 * Which quote is shown on which day. Blocks of N days each show every quote
 * once, shuffled by PCG32 seeded with the block number; a block never opens
 * with the quote that closed the previous one. The first `legacy` quotes kept
 * their launch order; the ones added later run once in a shuffle of their own
 * before the rotation cycles through all N (see tools/qotd/schedule.py).
 */
class Calendar(val n: Int, val legacy: Int, val launch: Int) {
    init {
        require(n >= 3) { "the schedule needs at least three quotes" }
    }

    private val grown = legacy in 3 until n
    private val freshStart = launch + legacy
    private val cycleStart = freshStart + (n - legacy)
    private val cache = object : LinkedHashMap<Long, IntArray>(16, 0.75f, true) {
        override fun removeEldestEntry(eldest: MutableMap.MutableEntry<Long, IntArray>) = size > 16
    }

    private fun rawPermutation(block: Long, size: Int): IntArray = synchronized(cache) {
        val key = block * 4096 + size
        cache.getOrPut(key) {
            val rng = Pcg32(SEED xor block, SEQUENCE)
            val order = IntArray(size) { it }
            for (i in size - 1 downTo 1) {
                val j = rng.bounded(i + 1)
                val t = order[i]; order[i] = order[j]; order[j] = t
            }
            order
        }
    }

    private fun seamed(order: IntArray, previous: Int): IntArray {
        if (order[0] != previous) return order
        val copy = order.copyOf()
        copy[0] = order[1]; copy[1] = order[0]
        return copy
    }

    private fun simple(day: Int, size: Int): Int {
        val offset = (day - BASE_DAY).toLong()
        val block = Math.floorDiv(offset, size.toLong())
        val pos = Math.floorMod(offset, size.toLong()).toInt()
        val previous = rawPermutation(block - 1, size)[size - 1]
        return seamed(rawPermutation(block, size), previous)[pos]
    }

    private fun freshAt(i: Int): Int = legacy + rawPermutation(FRESH_BLOCK, n - legacy)[i]

    fun quoteForDay(day: Int): Int {
        if (!grown) return simple(day, n)
        if (day < freshStart) return simple(day, legacy)
        if (day < cycleStart) return freshAt(day - freshStart)
        val offset = (day - cycleStart).toLong()
        val block = offset / n
        val pos = (offset % n).toInt()
        val previous = if (block == 0L) freshAt(n - legacy - 1) else rawPermutation(block - 1, n)[n - 1]
        return seamed(rawPermutation(block, n), previous)[pos]
    }

    companion object {
        val SEED = 0x853C49E6748FEA9BuL.toLong()
        val SEQUENCE = 0xDA3E39CB94B95BDBuL.toLong()
        const val FRESH_BLOCK = 0x4000_0000L
        val BASE_DAY = Civil.daysFromCivil(2000, 1, 1)
    }
}
