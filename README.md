# quotes

A white page with one sentence in the middle. Every day at midnight, in your
own time zone, it changes. That is the whole site.

Behind it is a deliberately over-engineered machine: a SQLite database of more
than 700 quotes about overcoming, a Python compiler that turns that database
into a single 7.7 MB WebAssembly Text file, and a runtime written by hand in
raw WebAssembly that does the calendar math, the pseudo-random scheduling and
the string storage. JavaScript only reads the clock and paints the text.

