-- seed 705 :: fr dedications

INSERT INTO dedication_translations (dedication_id, locale, body, author) VALUES
    ((SELECT id FROM dedications WHERE day = '2026-11-16'), 'fr',
     'Pardon de t''avoir fait souffrir. Je t''aime.', NULL);
