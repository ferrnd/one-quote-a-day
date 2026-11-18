-- seed 707 :: it dedications

INSERT INTO dedication_translations (dedication_id, locale, body, author) VALUES
    ((SELECT id FROM dedications WHERE day = '2026-11-16'), 'it',
     'Scusami per averti fatto soffrire. Ti amo.', NULL);
