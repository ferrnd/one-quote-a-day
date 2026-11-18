-- seed 701 :: pt-BR dedications
--
-- Day 1, in the words it was first written in.

INSERT INTO dedication_translations (dedication_id, locale, body, author) VALUES
    ((SELECT id FROM dedications WHERE day = '2026-11-16'), 'pt-BR',
     'Desculpe por fazer você sofrer. Eu te amo.', NULL);
