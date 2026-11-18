  ;; ======================================================= strings ==
  ;;  Accessors over the record table and the string pool.

  (func $record (param $i i32) (result i32)
    (call $assert_ready)
    (if (i32.ge_u (local.get $i) (global.get $record_count))
      (then (unreachable)))
    (i32.add (global.get $records) (i32.shl (local.get $i) (i32.const 4))))

  (func (export "quote_text_ptr") (param $i i32) (result i32)
    (i32.load offset=0 (call $record (local.get $i))))

  (func (export "quote_text_len") (param $i i32) (result i32)
    (i32.load offset=4 (call $record (local.get $i))))

  (func (export "quote_author_ptr") (param $i i32) (result i32)
    (i32.load offset=8 (call $record (local.get $i))))

  (func (export "quote_author_len") (param $i i32) (result i32)
    (i32.load offset=12 (call $record (local.get $i))))

  (func (export "quote_count") (result i32) (global.get $quote_count))
  (func (export "author_count") (result i32) (global.get $author_count))
  (func (export "record_count") (result i32) (global.get $record_count))
  (func (export "dedication_count") (result i32) (global.get $dedication_count))
  (func (export "schedule_base") (result i32) (global.get $schedule_base))
  (func (export "schedule_length") (result i32) (global.get $schedule_len))

  ;; fnv1a(ptr, len) -> 32-bit FNV-1a hash of a byte range
  (func $fnv1a (export "fnv1a") (param $ptr i32) (param $len i32) (result i32)
    (local $hash i32) (local $end i32)
    (local.set $hash (i32.const 0x811c9dc5))
    (local.set $end (i32.add (local.get $ptr) (local.get $len)))
    (block $done
      (loop $next
        (br_if $done (i32.ge_u (local.get $ptr) (local.get $end)))
        (local.set $hash
          (i32.mul (i32.xor (local.get $hash) (i32.load8_u (local.get $ptr)))
                   (i32.const 0x01000193)))
        (local.set $ptr (i32.add (local.get $ptr) (i32.const 1)))
        (br $next)))
    (local.get $hash))
