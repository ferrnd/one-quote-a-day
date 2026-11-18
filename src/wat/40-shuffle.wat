  ;; ======================================================= shuffle ==
  ;;  Materialise the raw permutation of n items for a block into scratch
  ;;  memory. Mirrors raw_permutation(block, n) in tools/qotd/schedule.py.

  (func $scratch_slot (param $i i32) (result i32)
    (i32.add (global.get $scratch) (i32.shl (local.get $i) (i32.const 2))))

  (func $perm_at (param $i i32) (result i32)
    (i32.load (call $scratch_slot (local.get $i))))

  (func $permute (param $block i32) (param $n i32)
    (local $i i32) (local $j i32)
    (local $pi i32) (local $pj i32) (local $tmp i32)
    ;; already there? permutations are pure functions of (block, n)
    (if (i32.and (global.get $cached_valid)
                 (i32.and (i32.eq (global.get $cached_block) (local.get $block))
                          (i32.eq (global.get $cached_n) (local.get $n))))
      (then (return)))
    (call $pcg_seed
      (i64.xor (global.get $SCHEDULE_SEED) (i64.extend_i32_s (local.get $block)))
      (global.get $SCHEDULE_SEQUENCE))
    ;; identity: scratch[i] = i
    (local.set $i (i32.const 0))
    (block $filled
      (loop $fill
        (br_if $filled (i32.ge_u (local.get $i) (local.get $n)))
        (i32.store (call $scratch_slot (local.get $i)) (local.get $i))
        (local.set $i (i32.add (local.get $i) (i32.const 1)))
        (br $fill)))
    ;; Fisher-Yates, top down: swap(i, bounded(i + 1)) for i = n-1 .. 1
    (local.set $i (i32.sub (local.get $n) (i32.const 1)))
    (block $shuffled
      (loop $swap
        (br_if $shuffled (i32.le_s (local.get $i) (i32.const 0)))
        (local.set $j (call $pcg_bounded (i32.add (local.get $i) (i32.const 1))))
        (local.set $pi (call $scratch_slot (local.get $i)))
        (local.set $pj (call $scratch_slot (local.get $j)))
        (local.set $tmp (i32.load (local.get $pi)))
        (i32.store (local.get $pi) (i32.load (local.get $pj)))
        (i32.store (local.get $pj) (local.get $tmp))
        (local.set $i (i32.sub (local.get $i) (i32.const 1)))
        (br $swap)))
    (global.set $cached_block (local.get $block))
    (global.set $cached_n (local.get $n))
    (global.set $cached_valid (i32.const 1)))
