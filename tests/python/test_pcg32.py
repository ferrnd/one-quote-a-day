import unittest

from tools.qotd.pcg32 import Pcg32


class Pcg32Test(unittest.TestCase):
    def test_reference_vector(self):
        # First outputs of the official pcg32-demo, seeded with (42, 54).
        rng = Pcg32(42, 54)
        self.assertEqual(
            [rng.next_u32() for _ in range(6)],
            [0xA15C02B7, 0x7B47F409, 0xBA1D3330, 0x83D2F293, 0xBFA4784B, 0xCBED606E],
        )

    def test_outputs_are_32_bit(self):
        rng = Pcg32(0xDEADBEEF, 0xCAFEF00D)
        for _ in range(10_000):
            self.assertLessEqual(rng.next_u32(), 0xFFFF_FFFF)

    def test_bounded_stays_in_range(self):
        rng = Pcg32(1, 1)
        for bound in (1, 2, 3, 7, 764, 65_535):
            for _ in range(500):
                self.assertTrue(0 <= rng.bounded(bound) < bound)

    def test_bounded_rejects_bad_bounds(self):
        rng = Pcg32(1, 1)
        with self.assertRaises(ValueError):
            rng.bounded(0)

    def test_same_seed_same_stream(self):
        a, b = Pcg32(7, 11), Pcg32(7, 11)
        self.assertEqual([a.next_u32() for _ in range(64)], [b.next_u32() for _ in range(64)])

    def test_sequence_changes_stream(self):
        a, b = Pcg32(7, 11), Pcg32(7, 12)
        self.assertNotEqual([a.next_u32() for _ in range(8)], [b.next_u32() for _ in range(8)])


if __name__ == "__main__":
    unittest.main()
