import struct
import unittest
import zlib

from tools.qotd import ogimage


class OgImageTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.png = ogimage.render()

    def test_is_a_1200x630_greyscale_png(self):
        self.assertEqual(self.png[:8], b"\x89PNG\r\n\x1a\n")
        width, height, depth, colour = struct.unpack(">IIBB", self.png[16:26])
        self.assertEqual((width, height, depth, colour), (1200, 630, 8, 0))

    def test_chunks_have_valid_crcs(self):
        pos = 8
        while pos < len(self.png):
            (length,) = struct.unpack(">I", self.png[pos:pos + 4])
            kind = self.png[pos + 4:pos + 8]
            data = self.png[pos + 8:pos + 8 + length]
            (crc,) = struct.unpack(">I", self.png[pos + 8 + length:pos + 12 + length])
            self.assertEqual(crc, zlib.crc32(kind + data) & 0xFFFFFFFF, kind)
            pos += 12 + length

    def test_only_ink_and_paper_with_antialiasing_between(self):
        idat = self.png[self.png.index(b"IDAT") + 4:self.png.index(b"IEND") - 8]
        raw = zlib.decompress(idat)
        pixels = set(raw[i] for i in range(len(raw)) if i % 1201)
        self.assertIn(0x00, pixels)
        self.assertIn(0xFF, pixels)
        corners = (raw[1], raw[1200], raw[-1200], raw[-1])
        self.assertEqual(set(corners), {0xFF})

    def test_is_deterministic(self):
        self.assertEqual(ogimage.render(), self.png)


if __name__ == "__main__":
    unittest.main()
