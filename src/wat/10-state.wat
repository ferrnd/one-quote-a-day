  ;; ========================================================= state ==
  ;;  Mirrors of the header fields, loaded once by $init.

  (global $MAGIC  i32 (i32.const 0x44544F51)) ;; "QOTD"
  (global $FORMAT i32 (i32.const 3))

  (global $ready          (mut i32) (i32.const 0))
  (global $quote_count    (mut i32) (i32.const 0))
  (global $author_count   (mut i32) (i32.const 0))
  (global $records        (mut i32) (i32.const 0))
  (global $pool           (mut i32) (i32.const 0))
  (global $pool_len       (mut i32) (i32.const 0))
  (global $schedule       (mut i32) (i32.const 0))
  (global $schedule_base  (mut i32) (i32.const 0))
  (global $schedule_len   (mut i32) (i32.const 0))
  (global $scratch        (mut i32) (i32.const 0))
  (global $pool_fnv1a     (mut i32) (i32.const 0))
  (global $dedication_count (mut i32) (i32.const 0))
  (global $dedications    (mut i32) (i32.const 0))
  (global $record_count   (mut i32) (i32.const 0)) ;; quotes + dedications

  ;;  Calendar growth (see 50-schedule.wat): launch day, quotes at launch, and
  ;;  the first days of the fresh run and of the full rotation
  (global $launch       (mut i32) (i32.const 0))
  (global $legacy       (mut i32) (i32.const 0))
  (global $grown        (mut i32) (i32.const 0))
  (global $fresh_start  (mut i32) (i32.const 0))
  (global $cycle_start  (mut i32) (i32.const 0))
  (global $FRESH_BLOCK  i32 (i32.const 0x40000000))

  ;;  PCG32 generator state (see 30-pcg32.wat)
  (global $pcg_state (mut i64) (i64.const 0))
  (global $pcg_inc   (mut i64) (i64.const 0))
  (global $PCG_MULTIPLIER i64 (i64.const 6364136223846793005))

  ;;  Schedule parameters, shared with tools/qotd/schedule.py
  (global $SCHEDULE_SEED     i64 (i64.const 0x853c49e6748fea9b))
  (global $SCHEDULE_SEQUENCE i64 (i64.const 0xda3e39cb94b95bdb))

  ;;  Which raw permutation currently sits in scratch memory
  (global $cached_block (mut i32) (i32.const 0))
  (global $cached_valid (mut i32) (i32.const 0))
  (global $cached_n     (mut i32) (i32.const 0))
