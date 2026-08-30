---
title: Model-driven apps
description: Replacing the Notes subgrid on a form, and mapping the six columns.
order: 4
---

# Using it on a model-driven form

This is the host the control is built for: it is the only one where a press
actually produces a file.

:::steps
1. Open the form in the modern form designer.
2. Add a **subgrid** for the **Notes** table related to the record, or select the
   one already on the form.
3. Under **Components**, add **Attachment List** and switch it on for Web,
   Tablet and Phone.
4. Map the six columns below.
:::

## The six roles

The control assigns meaning to specific columns rather than rendering whatever
the view has, so each one is mapped by hand. The default Notes associated view
does not contain the size, the type or the is-a-file flag — mapping them is what
puts them in the query.

| Role | Map it to | Required | Without it |
| --- | --- | --- | --- |
| File name | `filename` | **yes** | The control lists nothing and says so |
| File size | `filesize` | no | No size is shown |
| File type | `mimetype` | no | Downloads are saved as a generic file |
| Is a file | `isdocument` | no | A row with a file name is treated as a file |
| Title | `subject` | no | The file name is the title |
| Created on | `createdon` | no | No date is shown |

**Is a file** is the one worth mapping even though it is optional. Without it,
a text note that happens to have a file name is offered a download that has
nothing behind it.

## The Body column property

Leave it at `documentbody`. It is the column the file's bytes live in, and it is
deliberately not one of the roles above — a view that selected it would fetch
every attachment on the record on every form load. It is fetched one row at a
time, on the press.

Change it only for a custom attachment table whose body column is named
something else.

## Permissions

The control declares **WebAPI** as an optional feature, so importing it prompts
the maker once. It is used for exactly one call — reading the body column of the
row being downloaded — and for nothing else.

## The subgrid's own command bar

New and Delete stay above the control and keep working: this control reads and
downloads, and does not attempt either. If you would rather they were not there,
they are the subgrid's setting rather than this control's.
