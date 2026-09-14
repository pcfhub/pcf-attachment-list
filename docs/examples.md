---
title: Examples
description: Four configurations, and what each is for.
order: 6
---

# Examples

## A document list on a case form

The default. Everything on the record, files and notes together.

| Setting | Value |
| --- | --- |
| Items | Notes subgrid on the record |
| File name | `filename` |
| File size | `filesize` |
| File type | `mimetype` |
| Is a file | `isdocument` |
| Title | `subject` |
| Created on | `createdon` |
| Hide text notes | off |
| Page size | 25 |

## A drop zone for signed paperwork

A section whose job is to collect scanned PDFs, and nothing else.

| Setting | Value |
| --- | --- |
| Hide text notes | **on** |
| Allowed file types | `.pdf` |
| Maximum upload (MB) | 10 |

Only PDFs are taken, whether dropped or picked; anything else is named under
the list as not allowed. The 10 MB ceiling applies only if the organisation's
own limit is higher — if the environment is at the 5 MB default, that is the
limit the file meets first.

## Files only, on a contract form

The same control on a form where the conversation lives somewhere else and the
section is about documents.

| Setting | Value |
| --- | --- |
| Hide text notes | **on** |
| Maximum download (MB) | 10 |

Hiding the notes changes the empty state as well as the list: a record with
notes and no files says *No attachments on this record*, not *No notes*, because
the second would be untrue and the first is fixable by unticking the box.

## A custom attachment table

The control reads the entity name from the bound view rather than assuming the
Notes table, so a custom table of the same shape works with no code change.

| Setting | Value |
| --- | --- |
| Items | A view of `contoso_projectfile` |
| File name | `contoso_filename` |
| Body column | `contoso_filedata` |

The six roles are mapped to that table's own columns, and **Body column** is set
to whatever holds the bytes. An upload writes to the same mapped columns — the
file name, type and is-a-file flag go wherever those three roles point — so a
custom table needs at least **File name** mapped before files can be attached
to it.

## Reacting to an upload

**Attached note ID** is set as each Note is created, before the list refreshes.
A form script can react to it — to stamp the record, or to start something that
needs the file to exist — by handling the control's output through the
subgrid's `OnChange`, or simply by watching the subgrid it refreshes.

## Reacting to a download

On a form there is nothing to do — the file arrives. In a canvas app, or if you
want to log that somebody took a copy, the output property is the hook:

```powerfx
If(
    !IsBlank(AttachmentList1.DownloadedRecordId),
    Patch(
        Downloads,
        Defaults(Downloads),
        { Note: AttachmentList1.DownloadedRecordId, When: Now() }
    )
)
```
