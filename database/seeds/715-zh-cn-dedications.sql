-- seed 715 :: zh-CN dedications

INSERT INTO dedication_translations (dedication_id, locale, body, author) VALUES
    ((SELECT id FROM dedications WHERE day = '2026-11-16'), 'zh-CN',
     '对不起，让你受苦了。我爱你。', NULL);
