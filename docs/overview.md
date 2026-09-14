---
title: Overview
description: The notes and attachments on a record, with download — and drag-and-drop upload.
order: 1
---

# Attachment List

Point it at a Notes subgrid and it lists what is on the record — the files with
a glyph, a size and a date, the text notes alongside them — and puts a Download
button on every row that has a file behind it. Drop files onto the list, or
press **Add files**, and each one becomes a Note on the record.

::image{src=media/screenshot.png alt="Attachment List on a form: an Add files button above five files and two notes, and a line beneath saying one dropped file was attached and another refused for size" zoom}

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

**Uploading is a drop, and it is several files at once.** Since 0.2.0 the
whole list is a drop target and there is an **Add files** button for the
hosts and users without a mouse. Each file becomes a Note row through the
Web API — name, type and bytes, attached to the record the form is on — one
at a time, and the list refreshes once at the end. A file over the
organisation's own attachment limit is refused before it is read, and says
so.

**Nothing is deleted or renamed, and text notes are not written.** The
subgrid's own command bar sits above the control and still does both — Delete
is the platform's, and New is the way to add a note that is words rather than a
file.

## Where it works

**Model-driven forms**, fully. On a table's **main grid** the list and the
download work and the upload does not — there is no record to attach to. In a
**canvas app** the list renders and neither transfer does:
`context.navigation.openFile` is model-driven only and `context.webAPI` is not
available to canvas at all. Rather than refuse to start, the control lists the
notes and reports each download press through an output property so you can do
it yourself in Power Fx — see *Canvas apps*.
