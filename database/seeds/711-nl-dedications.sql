-- seed 711 :: nl dedications

INSERT INTO dedication_translations (dedication_id, locale, body, author) VALUES
    ((SELECT id FROM dedications WHERE day = '2026-11-16'), 'nl',
     'Het spijt me dat ik je heb laten lijden. Ik hou van je.', NULL);
