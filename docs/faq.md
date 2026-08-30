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

## Nothing appears at all, and there is no error.

The **File name** role is not mapped — the control says so where the list would
be. If it is mapped and the list is still empty, the view itself has no rows;
try the subgrid without the control.

## Why does the size say 240 KB when the file is 245,760 bytes?

Because 245,760 bytes is 240 KB, and a list of byte counts with group separators
in it is unreadable. The download itself uses the exact bytes.

## Can I preview a PDF instead of downloading it?

No. The control asks the platform to *save* the file rather than to open it,
deliberately: the button says Download, and asking the host to open would render
some file types inline and save others, so the same button would do two
different things depending on what was in the row.

## Can I upload from here?

No — use the subgrid's own **New** command, which sits above the control and
does exactly that. Uploading is `pcf-file-drop`'s job.

## Why does it need the Web API permission?

For one call: reading the body column of the row being downloaded. The bytes are
not on the view, and there is no other way to reach them. It is declared as an
*optional* feature, so a host without it loads the control anyway.

## Does it work in a canvas app?

The list does. The download does not, and cannot — see *Canvas apps* for the
reason and for the output property that gives you a route.

## It works on my form and not on a colleague's.

Check field-level security on the Note columns, and check whether their form's
subgrid maps the same six roles. A role mapped on one form is not mapped on
another.

## Where do I report a problem?

[github.com/pcfhub/pcf-attachment-list/issues](https://github.com/pcfhub/pcf-attachment-list/issues).
