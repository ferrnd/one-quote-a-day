-- seed 713 :: ja dedications

INSERT INTO dedication_translations (dedication_id, locale, body, author) VALUES
    ((SELECT id FROM dedications WHERE day = '2026-11-16'), 'ja',
     'あなたを苦しませてしまって、ごめんなさい。愛しています。', NULL);
