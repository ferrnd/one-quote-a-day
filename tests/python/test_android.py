import json
import unittest
from pathlib import Path

from tools.qotd import android, database

ROOT = Path(__file__).resolve().parents[2]
ASSET = ROOT / "android" / "app" / "src" / "main" / "assets" / "quotes.json"
GOLDEN = ROOT / "android" / "app" / "src" / "test" / "resources" / "golden.txt"


class AndroidExportTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.catalog = database.load(ROOT / "database")
        cls.data = android.export(cls.catalog)

    def test_every_language_has_every_quote_and_author(self):
        n = len(self.catalog)
        codes = [l["code"] for l in self.data["locales"]]
        self.assertEqual(codes[0], "en")
        self.assertEqual(len(self.data["author"]), n)
        for code in codes:
            self.assertEqual(len(self.data["text"][code]), n, code)
            self.assertEqual(len(self.data["authors"][code]), len(self.catalog.authors), code)
            for d in self.data["dedications"]:
                self.assertIn(code, d["text"])

    def test_day_one_is_the_unsigned_dedication(self):
        (day1,) = [d for d in self.data["dedications"] if d["day"] == self.data["launch"]]
        self.assertIsNone(day1["text"]["en"][1])

    def test_committed_assets_are_current(self):
        """The app ships the files `python -m tools.qotd android` writes; they must match the database."""
        committed = json.loads(ASSET.read_text(encoding="utf-8"))
        self.assertEqual(committed, json.loads(json.dumps(self.data, ensure_ascii=False)))
        self.assertEqual(GOLDEN.read_text(encoding="utf-8"), android.golden(self.catalog))


if __name__ == "__main__":
    unittest.main()
