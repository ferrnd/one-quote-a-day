import unittest
from pathlib import Path

from tools.qotd import database, schedule
from tools.qotd.civil import days_from_civil

ROOT = Path(__file__).resolve().parents[2]


class CalendarTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.catalog = database.load(ROOT / "database")
        cls.cal = database.calendar_of(cls.catalog)

    def test_reads_the_calendar_row(self):
        self.assertEqual(self.cal.launch, days_from_civil(2026, 11, 16))
        self.assertEqual(self.cal.legacy, 764)
        self.assertEqual(self.cal.n, len(self.catalog))
        self.assertTrue(self.cal.grown)

    def test_launch_era_keeps_the_original_order(self):
        for day in range(self.cal.launch - 30, self.cal.fresh_start):
            self.assertEqual(self.cal.quote_for_day(day), schedule.quote_for_day(day, 764))

    def test_new_quotes_come_next_each_exactly_once(self):
        run = [self.cal.quote_for_day(d) for d in range(self.cal.fresh_start, self.cal.cycle_start)]
        self.assertEqual(sorted(run), list(range(764, self.cal.n)))

    def test_then_every_block_cycles_through_all_quotes(self):
        for block in (0, 1, 7):
            start = self.cal.cycle_start + block * self.cal.n
            days = [self.cal.quote_for_day(d) for d in range(start, start + self.cal.n)]
            self.assertEqual(sorted(days), list(range(self.cal.n)))

    def test_no_repeats_across_the_seams(self):
        for seam in (self.cal.fresh_start, self.cal.cycle_start, self.cal.cycle_start + self.cal.n):
            days = [self.cal.quote_for_day(d) for d in range(seam - 3, seam + 3)]
            for a, b in zip(days, days[1:]):
                self.assertNotEqual(a, b)

    def test_table_matches_direct_computation(self):
        table = self.cal.table()
        for offset in list(range(0, len(table), 1499)) + [
                self.cal.fresh_start - schedule.BASE_DAY + k for k in range(-2, 3)] + [
                self.cal.cycle_start - schedule.BASE_DAY + k for k in range(-2, 3)]:
            self.assertEqual(table[offset], self.cal.quote_for_day(schedule.BASE_DAY + offset))

    def test_without_growth_it_is_the_plain_rotation(self):
        flat = schedule.Calendar(n=100, legacy=100, launch=self.cal.launch)
        for day in range(self.cal.launch, self.cal.launch + 300):
            self.assertEqual(flat.quote_for_day(day), schedule.quote_for_day(day, 100))


if __name__ == "__main__":
    unittest.main()
