  ;; ========================================================= pcg32 ==
  ;;  PCG-XSH-RR with 64-bit state and 32-bit output (O'Neill, 2014).
  ;;  Mirrors tools/qotd/pcg32.py bit for bit.

  ;; pcg32_next() -> u32
  (func $pcg_next (export "pcg32_next") (result i32)
    (local $old i64) (local $xorshifted i32) (local $rot i32)
    (local.set $old (global.get $pcg_state))
    ;; advance the LCG: state = old * MULTIPLIER + inc  (mod 2^64)
    (global.set $pcg_state
      (i64.add (i64.mul (local.get $old) (global.get $PCG_MULTIPLIER))
               (global.get $pcg_inc)))
    ;; xorshifted = ((old >> 18) ^ old) >> 27, truncated to 32 bits
    (local.set $xorshifted
      (i32.wrap_i64
        (i64.shr_u
          (i64.xor (i64.shr_u (local.get $old) (i64.const 18)) (local.get $old))
          (i64.const 27))))
    ;; rot = old >> 59
    (local.set $rot (i32.wrap_i64 (i64.shr_u (local.get $old) (i64.const 59))))
    (i32.rotr (local.get $xorshifted) (local.get $rot)))

  ;; pcg32_seed(initstate, initseq)
  (func $pcg_seed (export "pcg32_seed") (param $initstate i64) (param $initseq i64)
    (global.set $pcg_state (i64.const 0))
    (global.set $pcg_inc
      (i64.or (i64.shl (local.get $initseq) (i64.const 1)) (i64.const 1)))
    (drop (call $pcg_next))
    (global.set $pcg_state (i64.add (global.get $pcg_state) (local.get $initstate)))
    (drop (call $pcg_next)))

  ;; pcg32_bounded(bound) -> [0, bound), multiply-shift reduction
  (func $pcg_bounded (export "pcg32_bounded") (param $bound i32) (result i32)
    (i32.wrap_i64
      (i64.shr_u
        (i64.mul (i64.extend_i32_u (call $pcg_next))
                 (i64.extend_i32_u (local.get $bound)))
        (i64.const 32))))
