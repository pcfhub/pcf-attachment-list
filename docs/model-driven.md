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
4. **Map nothing.** Leave every column property empty.
:::

## Do not map the columns

:::callout{type=warning}
**Leave the File name property empty**, and the other five with it. The only
column a form designer can offer for it on the Notes table is **File
Name(deprecated)**, which Dataverse refuses to read — mapping it stops the whole
list loading with *"Retrieve can only return columns that are valid for read.
Column : dummyfilename"*. If you have already mapped it, clear it.
:::

That is not a limitation of this control so much as a fact about the Notes
table. Every column the control needs — `filename`, `filesize`, `mimetype`,
`isdocument` — is marked *not valid for form*, so a column picker will not
offer any of them. The one it does offer is the deprecated placeholder.

So the control asks for them itself, with `addColumn`, and finds them by their
logical names. Point it at the subgrid and it works.

## When you would map a role

The six column properties are an **override**, for an attachment table that is
not Notes — a custom table with the same shape but different column names.

| Property | Defaults to | Without it |
| --- | --- | --- |
| File name | `filename` | The control lists nothing and says so |
| File size | `filesize` | No size is shown |
| File type | `mimetype` | Downloads are saved as a generic file |
| Is a file | `isdocument` | A row with a file name is treated as a file |
| Title | `subject` | The file name is the title |
| Created on | `createdon` | No date is shown |

On such a table the picker can offer the columns, because they are ordinary
ones. Map them there and the control uses what you mapped in preference to the
defaults.

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
