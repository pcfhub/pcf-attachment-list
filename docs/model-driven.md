---
title: Model-driven apps
description: Replacing the Notes subgrid on a form, attaching files, and mapping the six columns.
order: 4
---

# Using it on a model-driven form

This is the host the control is built for: it is the only one where a press
actually produces a file, and the only one where a dropped file produces a
Note.

:::steps
1. Open the form in the modern form designer.
2. Add a **subgrid** for the **Notes** table related to the record, or select the
   one already on the form.
3. Under **Components**, add **Attachment List** and switch it on for Web,
   Tablet and Phone.
4. **Map nothing.** Leave every column property empty.
:::

## Attaching files

Drop one or more files anywhere on the list, or press **Add files** and pick
them. Each becomes a Note on the record the form is showing — with the file's
name and type, attached through the same relationship the subgrid reads — and
the list refreshes when the batch is done. A line under the list says what was
attached and, per file, what was refused and why.

Three things decide whether a file is taken, and all three are checked before
it is read:

- **Size.** Leave **Maximum upload (MB)** empty and the control reads the
  organisation's own attachment limit — the *Maximum file size* under system
  settings, 5 MB by default — and refuses against that. Set it to refuse
  earlier. Setting it *higher* than the organisation's limit does nothing
  useful: Dataverse still rejects the file, just after it has been sent.
- **Type.** **Allowed file types** takes an HTML `accept` rule —
  `.pdf,.docx,image/*` — and is applied to drops as well as to the picker,
  because a drop does not go through the picker. Empty allows anything, which
  is what the platform's own Notes allow.
- **Content.** An empty file is refused rather than becoming a Note with no
  body.

The button appears only where the host can perform the write: an editable
form, with a parent record, on a host that granted the Web API. On a read-only
form, a main grid or a canvas app there is no button and a drop is declined in
words. **Hide Add files** removes it on purpose, for a section that should
read and never write.

Blocked file extensions are the environment's setting, not this control's: a
`.exe` the organisation blocks is refused by Dataverse on the create, and the
message under the list is Dataverse's own.

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
the maker once. It is used for three calls — reading the body column of the row
being downloaded, creating the Note for a file being attached, and reading the
organisation's attachment size limit — and for nothing else.

Attaching also needs the user to be allowed to **create** Notes on that table,
which is the ordinary *Note* privilege in their security role. A user without
it sees the button and gets Dataverse's own refusal under the list, the same
as they would from the subgrid's New.

## The subgrid's own command bar

New and Delete stay above the control and keep working. Delete is still the
only way to remove a Note, and New is the way to add a *text* note — this
control writes files and nothing else. If you would rather the bar were not
there, it is the subgrid's setting rather than this control's.
