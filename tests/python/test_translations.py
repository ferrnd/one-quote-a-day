import sqlite3
import unittest
from pathlib import Path

from tools.qotd import database

ROOT = Path(__file__).resolve().parents[2]


class TranslationsTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.conn = database.compile_database(ROOT / "database")
        cls.catalog = database.read_catalog(cls.conn)

    @classmethod
    def tearDownClass(cls):
        cls.conn.close()

    def test_locales(self):
        self.assertEqual(self.catalog.locales[0][0], "en")
        self.assertIn("pt-BR", [code for code, _ in self.catalog.locales])

    def test_every_quote_has_its_own_portuguese_translation(self):
        (count,) = self.conn.execute(
            "SELECT count(*) FROM quote_translations WHERE locale = 'pt-BR'").fetchone()
        self.assertEqual(count, len(self.catalog))
        pt = self.catalog.translations["pt-BR"]
        self.assertEqual(len(set(pt)), len(pt), "two quotes share a translation")
        for quote, text in zip(self.catalog.quotes, pt):
            self.assertNotEqual(quote.body, text, quote.body)

    def test_translations_are_clean_text(self):
        for text in self.catalog.translations["pt-BR"]:
            self.assertEqual(text, text.strip())
            self.assertIn(text[-1], ".!?\"", text)
            self.assertFalse(any(ord(c) < 0x20 for c in text), text)

    def test_known_translations(self):
        pt = dict(zip((q.body for q in self.catalog.quotes), self.catalog.translations["pt-BR"]))
        self.assertEqual(pt["Fall seven times, stand up eight."], "Caia sete vezes, levante-se oito.")
        self.assertEqual(pt["In the end, everything will be okay. If it's not okay, it's not yet the end."],
                         "No fim, tudo dá certo. Se não deu certo, é porque ainda não chegou ao fim.")

    def test_author_names_and_dedication(self):
        names = dict(zip(self.catalog.authors, self.catalog.author_names["pt-BR"]))
        self.assertEqual(names["Confucius"], "Confúcio")
        self.assertEqual(names["Japanese Proverb"], "Provérbio japonês")
        self.assertEqual(names["Maya Angelou"], "Maya Angelou")
        self.assertEqual(self.catalog.dedication_texts["pt-BR"][0],
                         ("Desculpe por fazer você sofrer. Eu te amo.", None))

    def test_translation_intake_rejects_unknown_quotes(self):
        with self.assertRaises(sqlite3.DatabaseError):
            self.conn.execute(
                "INSERT INTO translation_intake (original, locale, body) VALUES (?, 'pt-BR', ?)",
                ("A quote that is not in the database.", "Uma frase que não existe."))
        self.conn.rollback()

    def test_incomplete_locales_fail_the_build(self):
        conn = database.compile_database(ROOT / "database")
        try:
            conn.execute("DELETE FROM quote_translations WHERE quote_id = 1")
            with self.assertRaises(database.DatabaseError):
                database.verify(conn)
        finally:
            conn.close()


if __name__ == "__main__":
    unittest.main()
