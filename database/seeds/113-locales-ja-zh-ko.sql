-- seed 113 :: locales
--
-- Japanese, Simplified Chinese and Korean: the seventh, eighth and ninth
-- translations, and the first in scripts without word spaces.

INSERT INTO locales (code, name, position) VALUES
    ('ja', '日本語', 7),
    ('zh-CN', '中文（简体）', 8),
    ('ko', '한국어', 9);
