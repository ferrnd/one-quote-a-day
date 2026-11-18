import sqlite3
import unittest
from pathlib import Path

from tools.qotd import database

ROOT = Path(__file__).resolve().parents[2]
DB = ROOT / "database"


class DatabaseTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.conn = database.compile_database(DB)
        cls.catalog = database.read_catalog(cls.conn)

    @classmethod
    def tearDownClass(cls):
        cls.conn.close()

    def test_more_than_five_hundred_quotes(self):
        self.assertGreater(len(self.catalog), 500)

    def test_bodies_are_unique_case_insensitively(self):
        bodies = [q.body.lower() for q in self.catalog.quotes]
        self.assertEqual(len(bodies), len(set(bodies)))

    def test_every_quote_is_attributed(self):
        for quote in self.catalog.quotes:
            self.assertTrue(quote.author.strip())

    def test_bodies_are_printable_ascii(self):
        for quote in self.catalog.quotes:
            self.assertTrue(all(0x20 <= ord(c) <= 0x7E for c in quote.body), quote.body)

    def test_bodies_end_with_punctuation(self):
        for quote in self.catalog.quotes:
            self.assertIn(quote.body[-1], ".!?'", quote.body)

    def test_every_theme_is_used(self):
        for slug, _title, count in self.catalog.themes:
            self.assertGreater(count, 0, slug)

    def test_seed_files_hold_at_most_ten_quotes(self):
        for path in database.seed_files(DB):
            if "INSERT INTO intake" not in path.read_text(encoding="utf-8"):
                continue
            rows = path.read_text(encoding="utf-8").count("\n    (")
            self.assertLessEqual(rows, 10, path.name)

    def test_day_one_dedication(self):
        dedications = {d.day: d for d in self.catalog.dedications}
        self.assertIn("2026-11-16", dedications)
        self.assertEqual(dedications["2026-11-16"].body, "I'm sorry for making you suffer. I love you.")
        self.assertIsNone(dedications["2026-11-16"].author)

    def test_dedications_reject_impossible_dates(self):
        with self.assertRaises(sqlite3.IntegrityError):
            self.conn.execute("INSERT INTO dedications (day, body) VALUES ('2026-02-30', 'Nope.')")
        self.conn.rollback()

    def test_intake_rejects_unknown_theme(self):
        with self.assertRaises(sqlite3.DatabaseError):
            self.conn.execute(
                "INSERT INTO intake (body, author, theme) VALUES (?, ?, ?)",
                ("A brand new quote that does not exist.", "Nobody", "no-such-theme"),
            )
        self.conn.rollback()

    def test_quotes_table_rejects_duplicates(self):
        first = self.catalog.quotes[0]
        with self.assertRaises(sqlite3.IntegrityError):
            self.conn.execute(
                "INSERT INTO intake (body, author, theme) VALUES (?, ?, ?)",
                (first.body, first.author, first.theme),
            )
        self.conn.rollback()

    def test_quotes_table_rejects_non_ascii(self):
        with self.assertRaises(sqlite3.IntegrityError):
            self.conn.execute(
                "INSERT INTO intake (body, author, theme) VALUES (?, ?, ?)",
                ("Café au lait is not allowed here.", "Somebody", "hope"),
            )
        self.conn.rollback()


if __name__ == "__main__":
    unittest.main()
