"""PCG32 (XSH RR 64/32), bit-for-bit identical to src/wat/30-pcg32.wat.

Reference: M. E. O'Neill, "PCG: A Family of Simple Fast Space-Efficient
Statistically Good Algorithms for Random Number Generation" (2014).
"""

from __future__ import annotations

MASK32 = 0xFFFF_FFFF
MASK64 = 0xFFFF_FFFF_FFFF_FFFF
MULTIPLIER = 6364136223846793005


class Pcg32:
    """A 64-bit state, 32-bit output permuted congruential generator."""

    __slots__ = ("state", "inc")

    def __init__(self, initstate: int, initseq: int) -> None:
        self.state = 0
        self.inc = ((initseq << 1) | 1) & MASK64
        self.next_u32()
        self.state = (self.state + (initstate & MASK64)) & MASK64
        self.next_u32()

    def next_u32(self) -> int:
        old = self.state
        self.state = (old * MULTIPLIER + self.inc) & MASK64
        xorshifted = (((old >> 18) ^ old) >> 27) & MASK32
        rot = old >> 59
        return ((xorshifted >> rot) | (xorshifted << ((-rot) & 31))) & MASK32

    def bounded(self, bound: int) -> int:
        """Map a 32-bit output into [0, bound) with a multiply-shift."""
        if not 0 < bound <= MASK32:
            raise ValueError(f"bound out of range: {bound}")
        return (self.next_u32() * bound) >> 32
