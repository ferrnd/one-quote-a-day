-- seed 703 :: es dedications

INSERT INTO dedication_translations (dedication_id, locale, body, author) VALUES
    ((SELECT id FROM dedications WHERE day = '2026-11-16'), 'es',
     'Perdón por hacerte sufrir. Te amo.', NULL);
