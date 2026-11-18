import struct
import unittest
from pathlib import Path

from tools.qotd import database, watgen

ROOT = Path(__file__).resolve().parents[2]


class WatgenTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.catalog = database.load(ROOT / "database")
        cls.layout = watgen.plan(cls.catalog)

    def test_fnv1a_reference_values(self):
        self.assertEqual(watgen.fnv1a32(b""), 0x811C9DC5)
        self.assertEqual(watgen.fnv1a32(b"a"), 0xE40C292C)
        self.assertEqual(watgen.fnv1a32(b"foobar"), 0xBF9CF968)

    def test_wat_string_escapes(self):
        self.assertEqual(watgen.wat_string('say "hi"'), '"say \\22hi\\22"')
        self.assertEqual(watgen.wat_string("back\\slash"), '"back\\5cslash"')

    def test_layout_regions_do_not_overlap(self):
        n = len(self.catalog)
        layout = self.layout
        self.assertEqual(layout.records_ptr, watgen.HEADER_SIZE)
        self.assertEqual(layout.pool_ptr, layout.records_ptr + n * watgen.RECORD_SIZE)
        self.assertGreaterEqual(layout.schedule_ptr, layout.pool_ptr + len(layout.pool))
        self.assertGreaterEqual(layout.scratch_ptr, layout.schedule_ptr + 2 * 146_097)
        self.assertLessEqual(layout.end, layout.pages * watgen.PAGE)

    def test_pointers_land_on_their_strings(self):
        pool, base = self.layout.pool, self.layout.pool_ptr
        for quote, (ptr, length) in zip(self.catalog.quotes, self.layout.quote_ptrs):
            self.assertEqual(pool[ptr - base:ptr - base + length].decode(), quote.body)
        for name, (ptr, length) in zip(self.catalog.authors, self.layout.author_ptrs):
            self.assertEqual(pool[ptr - base:ptr - base + length].decode(), name)

    def test_header_round_trips(self):
        raw = watgen.header_bytes(self.catalog, self.layout)
        self.assertEqual(len(raw), watgen.HEADER_SIZE)
        fields = dict(zip(watgen.HEADER_FIELDS, struct.unpack_from("<12I", raw)))
        self.assertEqual(fields["magic"], watgen.MAGIC)
        self.assertEqual(raw[:4], b"QOTD")
        self.assertEqual(fields["quote_count"], len(self.catalog))
        self.assertEqual(fields["pool_fnv1a"], watgen.fnv1a32(self.layout.pool))

    def test_generated_file_is_up_to_date(self):
        fragments = sorted((ROOT / "src" / "wat").glob("*.wat"))
        expected = watgen.render(self.catalog, fragments)
        actual = (ROOT / "generated" / "quotes.wat").read_text(encoding="ascii")
        self.assertTrue(actual == expected, "generated/quotes.wat is stale: run `npm run build`")


if __name__ == "__main__":
    unittest.main()
