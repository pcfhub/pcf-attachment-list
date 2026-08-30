---
title: Limitations
description: What this control does not do, and the constraints it accepts.
order: 7
---

# Limitations

**Downloading needs a model-driven app.** `context.navigation.openFile` is
documented model-driven apps only, and `context.webAPI` is not available to
canvas at all. In a canvas app the list renders and every press is reported
through an output property instead — see *Canvas apps*.

**It reads. It does not add, delete or rename.** Those are the subgrid's own
command bar, which keeps working above the control.

**It cannot bind a File column.** Power Apps component framework does not
support File columns as a bound property type at all — the manifest schema
reference says so outright — and `context.webAPI` has no method that can write
one. Attachments therefore have to be Note (`annotation`) rows, which is what
the Notes subgrid holds anyway.

**A file is fetched whole, into memory.** `retrieveRecord` has no streaming and
no way to cancel, so **Maximum download (MB)** refuses a file *before* it is
fetched, on the size the row declares. Refusing once the bytes are already in
the tab would not be refusing. The default is 32 MB.

**A download in flight cannot be stopped.** Navigating away from the form
abandons the result rather than cancelling the request. The same limit is the
reason only one download runs at a time.

**Nothing is announced when a download succeeds.** The browser's own download
chrome is the confirmation. Failures, refusals and empty files are announced.

**The note text is not shown, only its title.** A note with no `subject` is
listed as *Untitled note*. This control is a file list; the timeline is better
at being a timeline.

**The size in the list comes from the row.** If `filesize` disagrees with the
actual attachment — which happens when a row is written by an integration that
did not set it — the list shows what the row says and the download uses what
arrives.
