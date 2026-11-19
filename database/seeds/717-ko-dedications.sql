-- seed 717 :: ko dedications

INSERT INTO dedication_translations (dedication_id, locale, body, author) VALUES
    ((SELECT id FROM dedications WHERE day = '2026-11-16'), 'ko',
     '너를 아프게 해서 미안해. 사랑해.', NULL);
