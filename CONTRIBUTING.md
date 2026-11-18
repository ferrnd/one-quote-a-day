# Contributing

## Adding quotes

1. Create the next seed file in `database/seeds/`, for example
   `084-courage-07.sql`. Never edit or reorder existing seeds: quote ids are
   assigned in insertion order.
2. Insert at most ten rows into the `intake` view:

   ```sql
   INSERT INTO intake (body, author, theme) VALUES
       ('The quote, in plain ASCII.', 'Author Name', 'courage');
   ```

   Use straight quotes and apostrophes only, escape `'` as `''`, and end the
   body with punctuation. The theme must exist in `000-themes.sql`.
3. Run `npm run build && npm test` and commit the regenerated `generated/`
   and `docs/` together with the seed.

Adding quotes changes N, which reshuffles the whole calendar. That is expected.

## Translating

Every locale must translate every quote, or the build fails. When you add a
quote, add its translation in a new seed that inserts into
`translation_intake (original, locale, body)`, where `original` is the exact
English text. Translate the meaning, not the words: idioms, puns and rhythm
matter more than a literal match.

## Changing the runtime

Edit the fragments in `src/wat/`, never `generated/quotes.wat`. Anything the
runtime computes has a Python twin in `tools/qotd/`; keep them in lockstep and
extend the tests on both sides.

## Commit messages

This repository follows [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(db): add quotes on courage (batch 7)
fix(wat): handle negative block numbers in floor_div
docs(readme): explain the schedule
```

Common types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`,
`build`, `ci`, `chore`.
