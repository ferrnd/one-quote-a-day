import unittest

from tools.qotd import schedule
from tools.qotd.civil import days_from_civil


class ScheduleTest(unittest.TestCase):
    N = 764

    @classmethod
    def setUpClass(cls):
        cls.table = schedule.build_table(cls.N)

    def test_window_is_one_gregorian_cycle(self):
        self.assertEqual(len(self.table), 146_097)
        self.assertEqual(schedule.BASE_DAY, days_from_civil(2000, 1, 1))

    def test_every_block_shows_every_quote_once(self):
        for start in range(0, len(self.table) - self.N, self.N):
            self.assertEqual(sorted(self.table[start:start + self.N]), list(range(self.N)))

    def test_never_the_same_quote_two_days_in_a_row(self):
        for a, b in zip(self.table, self.table[1:]):
            self.assertNotEqual(a, b)

    def test_table_matches_direct_computation(self):
        for offset in list(range(0, 3 * self.N + 5)) + list(range(0, len(self.table), 1013)):
            day = schedule.BASE_DAY + offset
            self.assertEqual(schedule.quote_for_day(day, self.N), self.table[offset])

    def test_days_before_the_window_still_work(self):
        previous = None
        for day in range(schedule.BASE_DAY - 2 * self.N, schedule.BASE_DAY + 2):
            index = schedule.quote_for_day(day, self.N)
            self.assertTrue(0 <= index < self.N)
            self.assertNotEqual(index, previous)
            previous = index

    def test_seam_rule_is_exercised(self):
        swapped = 0
        for block in range(-2000, 2000):
            raw = schedule.raw_permutation(block, 5)
            if raw[0] == schedule.raw_permutation(block - 1, 5)[4]:
                swapped += 1
                fixed = schedule.block_permutation(block, 5)
                self.assertEqual(fixed[1], raw[0])
                self.assertEqual(fixed[0], raw[1])
        self.assertGreater(swapped, 0)

    def test_needs_three_quotes(self):
        with self.assertRaises(ValueError):
            schedule.block_permutation(0, 2)


if __name__ == "__main__":
    unittest.main()
