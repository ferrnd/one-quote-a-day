  ;; ========================================================== init ==
  ;;  Runs once at instantiation. A corrupt header or string pool traps,
  ;;  so a module that instantiates is a module that can be trusted.

  (func $assert_ready
    (if (i32.eqz (global.get $ready)) (then (unreachable))))

  (func $init
    (if (i32.ne (i32.load (i32.const 0)) (global.get $MAGIC)) (then (unreachable)))
    (if (i32.ne (i32.load (i32.const 4)) (global.get $FORMAT)) (then (unreachable)))
    (global.set $quote_count   (i32.load (i32.const 8)))
    (global.set $author_count  (i32.load (i32.const 12)))
    (global.set $records       (i32.load (i32.const 16)))
    (global.set $pool          (i32.load (i32.const 20)))
    (global.set $pool_len      (i32.load (i32.const 24)))
    (global.set $schedule      (i32.load (i32.const 28)))
    (global.set $schedule_base (i32.load (i32.const 32)))
    (global.set $schedule_len  (i32.load (i32.const 36)))
    (global.set $scratch       (i32.load (i32.const 40)))
    (global.set $pool_fnv1a    (i32.load (i32.const 44)))
    (global.set $dedication_count (i32.load (i32.const 48)))
    (global.set $dedications      (i32.load (i32.const 52)))
    (global.set $record_count
      (i32.add (global.get $quote_count) (global.get $dedication_count)))
    ;; the seam rule needs at least three quotes, u16 indices at most 65535
    (if (i32.lt_u (global.get $quote_count) (i32.const 3)) (then (unreachable)))
    (if (i32.gt_u (global.get $quote_count) (i32.const 65535)) (then (unreachable)))
    ;; scratch must fit in memory
    (if (i32.gt_u
          (i32.add (global.get $scratch) (i32.shl (global.get $quote_count) (i32.const 2)))
          (i32.shl (memory.size) (i32.const 16)))
      (then (unreachable)))
    (if (i32.ne (call $fnv1a (global.get $pool) (global.get $pool_len))
                (global.get $pool_fnv1a))
      (then (unreachable)))
    (global.set $cached_valid (i32.const 0))
    (global.set $ready (i32.const 1)))

  (start $init)
