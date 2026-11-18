"""qotd: the quote-of-the-day build pipeline.

The pipeline turns the SQL database into a single WebAssembly Text module:

    database/*.sql --(sqlite3)--> catalog --(schedule)--> calendar
                                     \                       /
                                      `----(watgen)---------'
                                                |
                                     generated/quotes.wat --(wabt)--> docs/quotes.wasm

Every module in this package is a pure, dependency-free reference
implementation of something the WebAssembly runtime also does, so the tests can
check the two against each other.
"""

__version__ = "1.0.0"
