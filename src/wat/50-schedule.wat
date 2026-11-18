  ;; ====================================================== schedule ==
  ;;  Which quote is shown on which day. Mirrors tools/qotd/schedule.py.

  ;; floor(a / b) for b > 0
  (func $floor_div (param $a i32) (param $b i32) (result i32)
    (local $q i32)
    (local.set $q (i32.div_s (local.get $a) (local.get $b)))
    (if (i32.lt_s (i32.rem_s (local.get $a) (local.get $b)) (i32.const 0))
      (then (local.set $q (i32.sub (local.get $q) (i32.const 1)))))
    (local.get $q))

  ;; quote_for_day_computed(day) -> index, ignoring the embedded table
  (func $quote_for_day_computed (export "quote_for_day_computed")
    (param $day i32) (result i32)
    (local $n i32) (local $rel i32) (local $block i32) (local $pos i32)
    (local $first i32) (local $second i32) (local $prev_last i32)
    (call $assert_ready)
    (local.set $n (global.get $quote_count))
    (local.set $rel (i32.sub (local.get $day) (global.get $schedule_base)))
    (local.set $block (call $floor_div (local.get $rel) (local.get $n)))
    (local.set $pos (i32.sub (local.get $rel) (i32.mul (local.get $block) (local.get $n))))
    (call $permute (local.get $block))
    ;; only the first two days of a block can be affected by the seam rule
    (if (i32.gt_u (local.get $pos) (i32.const 1))
      (then (return (call $perm_at (local.get $pos)))))
    (local.set $first (call $perm_at (i32.const 0)))
    (local.set $second (call $perm_at (i32.const 1)))
    ;; seam rule: never open a block with the quote that closed the last one
    (call $permute (i32.sub (local.get $block) (i32.const 1)))
    (local.set $prev_last (call $perm_at (i32.sub (local.get $n) (i32.const 1))))
    (if (i32.eq (local.get $first) (local.get $prev_last))
      (then
        (local.set $first (local.get $second))
        (local.set $second (local.get $prev_last))))
    (select (local.get $first) (local.get $second) (i32.eqz (local.get $pos))))

  ;; quote_for_day(day) -> index, using the embedded table when possible
  (func $quote_for_day (export "quote_for_day") (param $day i32) (result i32)
    (local $rel i32)
    (call $assert_ready)
    (local.set $rel (i32.sub (local.get $day) (global.get $schedule_base)))
    ;; unsigned compare folds "rel < 0" into "rel >= len"
    (if (result i32) (i32.lt_u (local.get $rel) (global.get $schedule_len))
      (then
        (i32.load16_u
          (i32.add (global.get $schedule) (i32.shl (local.get $rel) (i32.const 1)))))
      (else (call $quote_for_day_computed (local.get $day)))))

  ;; launch_day() -> days since 1970-01-01 of DAY 1 (2026-11-16)
  (func $launch_day (export "launch_day") (result i32)
    (call $days_from_civil (i32.const 2026) (i32.const 11) (i32.const 16)))

  ;; day_number(y, m, d) -> 1 on launch day, 2 the day after, ...
  (func $day_number (export "day_number")
    (param $y i32) (param $m i32) (param $d i32) (result i32)
    (i32.add
      (i32.sub (call $days_from_civil (local.get $y) (local.get $m) (local.get $d))
               (call $launch_day))
      (i32.const 1)))

  ;; dedication_for_day(day) -> record index of a dedication, or -1
  ;;  The table is tiny and sorted by day, so a linear scan that stops early
  ;;  beats anything cleverer.
  (func $dedication_for_day (export "dedication_for_day") (param $day i32) (result i32)
    (local $i i32) (local $entry i32) (local $entry_day i32)
    (call $assert_ready)
    (block $none
      (loop $scan
        (br_if $none (i32.ge_u (local.get $i) (global.get $dedication_count)))
        (local.set $entry (i32.add (global.get $dedications) (i32.shl (local.get $i) (i32.const 3))))
        (local.set $entry_day (i32.load (local.get $entry)))
        (if (i32.eq (local.get $entry_day) (local.get $day))
          (then (return (i32.load offset=4 (local.get $entry)))))
        (br_if $none (i32.gt_s (local.get $entry_day) (local.get $day)))
        (local.set $i (i32.add (local.get $i) (i32.const 1)))
        (br $scan)))
    (i32.const -1))

  ;; entry_for_day(day) -> what the page shows that day: a dedication if one
  ;;  is pinned to it, otherwise the scheduled quote.
  (func $entry_for_day (export "entry_for_day") (param $day i32) (result i32)
    (local $pinned i32)
    (local.set $pinned (call $dedication_for_day (local.get $day)))
    (if (result i32) (i32.ge_s (local.get $pinned) (i32.const 0))
      (then (local.get $pinned))
      (else (call $quote_for_day (local.get $day)))))

  ;; quote_for_date(y, m, d) -> record index for that date, or -1 if invalid
  (func $quote_for_date (export "quote_for_date")
    (param $y i32) (param $m i32) (param $d i32) (result i32)
    (if (i32.eqz (call $is_valid_date (local.get $y) (local.get $m) (local.get $d)))
      (then (return (i32.const -1))))
    (call $entry_for_day
      (call $days_from_civil (local.get $y) (local.get $m) (local.get $d))))
