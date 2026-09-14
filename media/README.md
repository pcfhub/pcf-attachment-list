# media

Screenshots, GIFs and video referenced from `docs/*.md` and from `pcfhub.json`.

PCFHub mirrors these onto its own CDN while it compiles a doc page, and writes
the mirrored URL into the page. Anything it cannot mirror keeps pointing at
`raw.githubusercontent.com`, so a large file still renders — it is just served
from GitHub instead.

Two things follow from that:

- **Keep them small.** There is a per-file ceiling and a per-sync file count on
  the hub's side. Screenshots in the tens of kilobytes mirror; a 40 MB video
  does not.
- **Paths are repository-relative, and a path is mirrored once.** The mirror
  is keyed by path and does not re-fetch a path it already holds — measured
  on 2026-09-14, when `pcf-attachment-list` 0.2.0 replaced all three
  screenshots in place and the hub went on serving the 0.1.x renders through
  a sync that took everything else. **To replace a screenshot, give it a new
  file name** (`screenshot-upload.png` beside the retired `screenshot.png`)
  and repoint `pcfhub.json` and the docs; the old object stays on the CDN,
  unreferenced, until a full sync.

Reference them from a doc page with the `image` and `video` directives, which
take repository-relative paths:

```markdown
::image{src=media/screenshot.png alt="What it shows" zoom}
::video{src=media/walkthrough.mp4 poster=media/walkthrough-poster.png}
```

A video without a poster renders as a blank box until it loads, so always ship
one.

`pcfhub.json` also names a `logo` and up to twelve `screenshots` from here.
