  ;; ======================================================= strings ==
  ;;  Accessors over the record table and the string pool. Records come in
  ;;  one block per locale; locale 0 is the English source.

  ;; record_l(i, k) -> address of record i in locale k (traps when out of range)
  (func $record_l (param $i i32) (param $k i32) (result i32)
    (call $assert_ready)
    (if (i32.ge_u (local.get $i) (global.get $record_count)) (then (unreachable)))
    (if (i32.ge_u (local.get $k) (global.get $locale_count)) (then (unreachable)))
    (i32.add (global.get $records)
      (i32.shl
        (i32.add (i32.mul (local.get $k) (global.get $record_count)) (local.get $i))
        (i32.const 4))))

  (func $record (param $i i32) (result i32)
    (call $record_l (local.get $i) (i32.const 0)))

  (func (export "localized_text_ptr") (param $i i32) (param $k i32) (result i32)
    (i32.load offset=0 (call $record_l (local.get $i) (local.get $k))))

  (func (export "localized_text_len") (param $i i32) (param $k i32) (result i32)
    (i32.load offset=4 (call $record_l (local.get $i) (local.get $k))))

  (func (export "localized_author_ptr") (param $i i32) (param $k i32) (result i32)
    (i32.load offset=8 (call $record_l (local.get $i) (local.get $k))))

  (func (export "localized_author_len") (param $i i32) (param $k i32) (result i32)
    (i32.load offset=12 (call $record_l (local.get $i) (local.get $k))))

  ;; locale table: code and display name of locale k
  (func $locale_entry (param $k i32) (result i32)
    (call $assert_ready)
    (if (i32.ge_u (local.get $k) (global.get $locale_count)) (then (unreachable)))
    (i32.add (global.get $locales) (i32.shl (local.get $k) (i32.const 4))))

  (func (export "locale_count") (result i32) (global.get $locale_count))
  (func (export "locale_code_ptr") (param $k i32) (result i32)
    (i32.load offset=0 (call $locale_entry (local.get $k))))
  (func (export "locale_code_len") (param $k i32) (result i32)
    (i32.load offset=4 (call $locale_entry (local.get $k))))
  (func (export "locale_name_ptr") (param $k i32) (result i32)
    (i32.load offset=8 (call $locale_entry (local.get $k))))
  (func (export "locale_name_len") (param $k i32) (result i32)
    (i32.load offset=12 (call $locale_entry (local.get $k))))

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
