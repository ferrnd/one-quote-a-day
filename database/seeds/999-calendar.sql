-- seed 999 :: calendar
--
-- Day 1 is 2026-11-16, when the site went live with 764 quotes. Applied last
-- so it can be checked against the final quote count.

INSERT INTO calendar (id, launch_day, legacy_quotes) VALUES (1, '2026-11-16', 764);
