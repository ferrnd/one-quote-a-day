-- seed 709 :: de dedications

INSERT INTO dedication_translations (dedication_id, locale, body, author) VALUES
    ((SELECT id FROM dedications WHERE day = '2026-11-16'), 'de',
     'Es tut mir leid, dass ich dich leiden ließ. Ich liebe dich.', NULL);
