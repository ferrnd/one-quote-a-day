  ;; ========================================================= civil ==
  ;;  Proleptic Gregorian calendar, after Howard Hinnant's algorithms.
  ;;  Day 0 is 1970-01-01. Mirrors tools/qotd/civil.py.

  ;; days_from_civil(y, m, d) -> days since 1970-01-01
  (func $days_from_civil (export "days_from_civil")
    (param $y i32) (param $m i32) (param $d i32) (result i32)
    (local $era i32) (local $yoe i32) (local $mp i32) (local $doy i32) (local $doe i32)
    ;; y -= m <= 2
    (local.set $y (i32.sub (local.get $y) (i32.le_s (local.get $m) (i32.const 2))))
    ;; era = (y >= 0 ? y : y - 399) / 400
    (local.set $era
      (i32.div_s
        (select (local.get $y)
                (i32.sub (local.get $y) (i32.const 399))
                (i32.ge_s (local.get $y) (i32.const 0)))
        (i32.const 400)))
    ;; yoe = y - era * 400                                   [0, 399]
    (local.set $yoe (i32.sub (local.get $y) (i32.mul (local.get $era) (i32.const 400))))
    ;; mp = m > 2 ? m - 3 : m + 9                            [0, 11], March = 0
    (local.set $mp
      (select (i32.sub (local.get $m) (i32.const 3))
              (i32.add (local.get $m) (i32.const 9))
              (i32.gt_s (local.get $m) (i32.const 2))))
    ;; doy = (153 * mp + 2) / 5 + d - 1                      [0, 365]
    (local.set $doy
      (i32.add
        (i32.div_s (i32.add (i32.mul (i32.const 153) (local.get $mp)) (i32.const 2))
                   (i32.const 5))
        (i32.sub (local.get $d) (i32.const 1))))
    ;; doe = yoe * 365 + yoe / 4 - yoe / 100 + doy           [0, 146096]
    (local.set $doe
      (i32.add
        (i32.sub
          (i32.add (i32.mul (local.get $yoe) (i32.const 365))
                   (i32.div_s (local.get $yoe) (i32.const 4)))
          (i32.div_s (local.get $yoe) (i32.const 100)))
        (local.get $doy)))
    ;; era * 146097 + doe - 719468
    (i32.sub
      (i32.add (i32.mul (local.get $era) (i32.const 146097)) (local.get $doe))
      (i32.const 719468)))

  ;; civil_from_days(z) -> y * 10000 + m * 100 + d   (for years 0..214748)
  (func $civil_from_days (export "civil_from_days") (param $z i32) (result i32)
    (local $era i32) (local $doe i32) (local $yoe i32) (local $y i32)
    (local $doy i32) (local $mp i32) (local $d i32) (local $m i32)
    (local.set $z (i32.add (local.get $z) (i32.const 719468)))
    (local.set $era
      (i32.div_s
        (select (local.get $z)
                (i32.sub (local.get $z) (i32.const 146096))
                (i32.ge_s (local.get $z) (i32.const 0)))
        (i32.const 146097)))
    (local.set $doe (i32.sub (local.get $z) (i32.mul (local.get $era) (i32.const 146097))))
    ;; yoe = (doe - doe/1460 + doe/36524 - doe/146096) / 365
    (local.set $yoe
      (i32.div_s
        (i32.sub
          (i32.add
            (i32.sub (local.get $doe) (i32.div_s (local.get $doe) (i32.const 1460)))
            (i32.div_s (local.get $doe) (i32.const 36524)))
          (i32.div_s (local.get $doe) (i32.const 146096)))
        (i32.const 365)))
    (local.set $y (i32.add (local.get $yoe) (i32.mul (local.get $era) (i32.const 400))))
    ;; doy = doe - (365 * yoe + yoe/4 - yoe/100)
    (local.set $doy
      (i32.sub (local.get $doe)
        (i32.sub
          (i32.add (i32.mul (i32.const 365) (local.get $yoe))
                   (i32.div_s (local.get $yoe) (i32.const 4)))
          (i32.div_s (local.get $yoe) (i32.const 100)))))
    (local.set $mp
      (i32.div_s (i32.add (i32.mul (i32.const 5) (local.get $doy)) (i32.const 2))
                 (i32.const 153)))
    (local.set $d
      (i32.add
        (i32.sub (local.get $doy)
                 (i32.div_s (i32.add (i32.mul (i32.const 153) (local.get $mp)) (i32.const 2))
                            (i32.const 5)))
        (i32.const 1)))
    (local.set $m
      (select (i32.add (local.get $mp) (i32.const 3))
              (i32.sub (local.get $mp) (i32.const 9))
              (i32.lt_s (local.get $mp) (i32.const 10))))
    (local.set $y (i32.add (local.get $y) (i32.le_s (local.get $m) (i32.const 2))))
    (i32.add
      (i32.add (i32.mul (local.get $y) (i32.const 10000))
               (i32.mul (local.get $m) (i32.const 100)))
      (local.get $d)))

  ;; is_leap_year(y) -> 0 | 1
  (func $is_leap_year (export "is_leap_year") (param $y i32) (result i32)
    (i32.and
      (i32.eqz (i32.rem_s (local.get $y) (i32.const 4)))
      (i32.or
        (i32.ne (i32.rem_s (local.get $y) (i32.const 100)) (i32.const 0))
        (i32.eqz (i32.rem_s (local.get $y) (i32.const 400))))))

  ;; days_in_month(y, m) -> 28..31, or 0 for an invalid month
  (func $days_in_month (export "days_in_month") (param $y i32) (param $m i32) (result i32)
    (if (i32.gt_u (i32.sub (local.get $m) (i32.const 1)) (i32.const 11))
      (then (return (i32.const 0))))
    (if (i32.eq (local.get $m) (i32.const 2))
      (then (return (i32.add (i32.const 28) (call $is_leap_year (local.get $y))))))
    ;; 30 days hath September, April, June and November
    (select (i32.const 30) (i32.const 31)
      (i32.or
        (i32.or (i32.eq (local.get $m) (i32.const 4)) (i32.eq (local.get $m) (i32.const 6)))
        (i32.or (i32.eq (local.get $m) (i32.const 9)) (i32.eq (local.get $m) (i32.const 11))))))

  ;; is_valid_date(y, m, d) -> 0 | 1
  (func $is_valid_date (export "is_valid_date")
    (param $y i32) (param $m i32) (param $d i32) (result i32)
    (i32.and
      (i32.ge_s (local.get $d) (i32.const 1))
      (i32.le_s (local.get $d) (call $days_in_month (local.get $y) (local.get $m)))))

  ;; weekday(z) -> 0 (Sunday) .. 6 (Saturday)
  (func $weekday (export "weekday") (param $z i32) (result i32)
    (if (result i32) (i32.ge_s (local.get $z) (i32.const -4))
      (then (i32.rem_s (i32.add (local.get $z) (i32.const 4)) (i32.const 7)))
      (else (i32.add (i32.rem_s (i32.add (local.get $z) (i32.const 5)) (i32.const 7))
                     (i32.const 6)))))
