---
title: FAQ
description: Questions this control has actually been asked.
order: 8
---

# FAQ

## Why is there a Download button on a row with no file?

There should not be. Map the **Is a file** role to `isdocument`. Without it the
control has to guess from whether the row has a file name, and a text note whose
subject was typed into the wrong column looks like a file.

## The list will not load, and something mentions `dummyfilename`.

The **File name** property is mapped to **File Name(deprecated)** — the only
thing a form designer offers for it on the Notes table, and a column Dataverse
refuses to read. It fails the entire query, not just that column.

Clear it, and clear the other five column properties with it. The control finds
those columns on its own. See *Model-driven apps*.

## Nothing appears at all, and there is no error.

The control could not find a file name column and could not ask for one — which
happens on a host that does not support `addColumn`. If the list is simply
empty, the view itself has no rows; try the subgrid without the control.

## Why does the size say 240 KB when the file is 245,760 bytes?

Because 245,760 bytes is 240 KB, and a list of byte counts with group separators
in it is unreadable. The download itself uses the exact bytes.

## Can I preview a PDF instead of downloading it?

No. The control asks the platform to *save* the file rather than to open it,
deliberately: the button says Download, and asking the host to open would render
some file types inline and save others, so the same button would do two
different things depending on what was in the row.

## Can I upload from here?

Yes, since 0.2.0 — drop files onto the list, or press **Add files**. Each
becomes a Note on the record. It needs an editable form with a parent record;
on a main grid or in a canvas app there is no button.

## I dropped a file and nothing happened.

Read the line under the list. A file over the organisation's attachment limit,
one outside **Allowed file types**, or an empty one is refused there by name.
If the line says attaching needs an editable form, the control is on a main
grid, a read-only form, or a canvas app — none of which has a record to attach
to or a Web API to attach with.

## Why does it say 5 MB when I never set a limit?

Because that is the organisation's own attachment limit — *Maximum file size*
in system settings, 5 MB out of the box. The control reads it rather than
guessing, so the refusal happens before the file is read instead of after it
has been sent. Raise it in the environment, not in the control.

## Where do I set the note's title?

You do not; the file name is the title, the same as the platform's own *New
note with attachment*. Open the Note afterwards to give it a subject.

## Why does it need the Web API permission?

For three calls: reading the body column of the row being downloaded, creating
the Note for a file being attached, and reading the organisation's attachment
limit. The bytes are not on the view, and there is no other way to reach or to
write them. It is declared as an *optional* feature, so a host without it loads
the control anyway.

## Does it work in a canvas app?

The list does. Neither the download nor the upload does, and neither can — see
*Canvas apps* for the reason, for the output property that gives you a download
route, and for why the platform's own Attachments control is the upload route
there.

## It works on my form and not on a colleague's.

Check field-level security on the Note columns, and check whether their form's
subgrid maps the same six roles. A role mapped on one form is not mapped on
another.

## Where do I report a problem?

[github.com/pcfhub/pcf-attachment-list/issues](https://github.com/pcfhub/pcf-attachment-list/issues).
