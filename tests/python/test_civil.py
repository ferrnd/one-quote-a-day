import datetime as dt
import unittest

from tools.qotd import civil

EPOCH_ORDINAL = dt.date(1970, 1, 1).toordinal()


class CivilTest(unittest.TestCase):
    def test_epoch(self):
        self.assertEqual(civil.days_from_civil(1970, 1, 1), 0)
        self.assertEqual(civil.civil_from_days(0), (1970, 1, 1))

    def test_matches_datetime_for_every_day_of_four_centuries(self):
        start = dt.date(1900, 1, 1)
        for offset in range(0, 146_097 + 365, 1):
            date = start + dt.timedelta(days=offset)
            z = date.toordinal() - EPOCH_ORDINAL
            self.assertEqual(civil.days_from_civil(date.year, date.month, date.day), z)
            if offset % 7 == 0:
                self.assertEqual(civil.civil_from_days(z), (date.year, date.month, date.day))

    def test_negative_years_round_trip(self):
        for z in range(-1_000_000, -900_000, 997):
            self.assertEqual(civil.days_from_civil(*civil.civil_from_days(z)), z)

    def test_weekday(self):
        self.assertEqual(civil.WEEKDAYS[civil.weekday(0)], "Thu")
        for offset in range(-3000, 3000, 13):
            date = dt.date(1970, 1, 1) + dt.timedelta(days=offset)
            self.assertEqual(civil.weekday(offset), date.isoweekday() % 7)

    def test_leap_years(self):
        self.assertTrue(civil.is_leap_year(2000))
        self.assertTrue(civil.is_leap_year(2024))
        self.assertFalse(civil.is_leap_year(1900))
        self.assertFalse(civil.is_leap_year(2026))

    def test_days_in_month(self):
        self.assertEqual(civil.days_in_month(2024, 2), 29)
        self.assertEqual(civil.days_in_month(2026, 2), 28)
        self.assertEqual(civil.days_in_month(2026, 4), 30)
        self.assertEqual(civil.days_in_month(2026, 12), 31)

    def test_iso(self):
        self.assertEqual(civil.iso(civil.days_from_civil(2026, 11, 17)), "2026-11-17")


if __name__ == "__main__":
    unittest.main()
