-- seed 000 :: themes
--
-- Every quote belongs to exactly one theme. Themes are inserted first so the
-- intake trigger can resolve slugs while the remaining seeds are applied.

INSERT INTO themes (slug, title) VALUES
    ('perseverance', 'Perseverance'),
    ('courage', 'Courage'),
    ('failure', 'Failure'),
    ('resilience', 'Resilience'),
    ('hope', 'Hope'),
    ('strength', 'Strength'),
    ('discipline', 'Discipline'),
    ('growth', 'Growth'),
    ('adversity', 'Adversity'),
    ('action', 'Action'),
    ('mindset', 'Mindset'),
    ('patience', 'Patience'),
    ('determination', 'Determination'),
    ('dreams', 'Dreams'),
    ('wisdom', 'Wisdom');
