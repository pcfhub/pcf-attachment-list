---
title: Overview
description: The notes and attachments on a record, with download.
order: 1
---

# Attachment List

Point it at a Notes subgrid and it lists what is on the record — the files with
a glyph, a size and a date, the text notes alongside them — and puts a Download
button on every row that has a file behind it.

::image{src=media/screenshot.png alt="Attachment List on a form, showing four files and two notes" zoom}

## Why this one

The out-of-the-box Notes control is a timeline: it is built for reading a
conversation, and the attachments are things hanging off the messages. This one
inverts that. It is a file list — sorted by the view, sized, typed, and one
press from the file itself — for the forms where the documents are the point and
the commentary is context.

Three things follow from that and are worth knowing before you configure it.

**Text notes are still shown.** An `annotation` row with no file is a note
somebody wrote, and a control that replaces the Notes subgrid and silently drops
half of what is on the record leaves the user unable to tell "there is nothing
more" from "this control is hiding things". They get a note glyph, no size and
no download button. Turn them off with **Hide text notes** if the section is
only about documents.

**The file's bytes are fetched on the press, not with the list.** A file body is
a base64 blob, and a view that selected it would download every attachment on
the record every time the form opened. So the list comes from the view and the
body comes from one `retrieveRecord` per download.

**Nothing is deleted, renamed or uploaded.** The subgrid's own command bar sits
above the control and still does all three — this control reads and downloads,
and the platform's New and Delete are better at their jobs than a reimplementation
would be.

## Where it works

**Model-driven apps**, fully. In a **canvas app** the list renders and the
download does not: `context.navigation.openFile` is model-driven only and
`context.webAPI` is not available to canvas at all. Rather than refuse to start,
the control lists the notes and reports each press through an output property so
you can do the download yourself in Power Fx — see *Canvas apps*.
