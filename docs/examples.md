---
title: Examples
description: Three configurations, and what each is for.
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
to whatever holds the bytes.

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
