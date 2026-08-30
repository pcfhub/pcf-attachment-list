---
title: API reference
description: Roles, properties and outputs, generated from the control manifest.
order: 5
---

# API reference

<!--
  Do not write the property tables by hand. `props-table` renders from what the
  hub parsed out of ControlManifest.Input.xml at the release being viewed, so it
  cannot drift from the control.
-->

## Dataset

::props-table{kind=dataset}

## Columns

::props-table{kind=dataset_column}

Six roles, one of them required. They are roles rather than a read of whatever
the view supplies because the default Notes associated view does not contain the
size, the type or the is-a-file flag — mapping a role is what puts the column in
the query, and an unmapped one is visible to the maker at configuration time
rather than to the user at click time.

## Input properties

::props-table{kind=input}

## Outputs

::props-table{kind=output}

## Notes

**The body column is a property, not a role, and that is deliberate.** A file's
bytes are a base64 blob; a view that selected them would fetch every attachment
on the record every time the form opened. It is read one row at a time, on the
press, through `context.webAPI.retrieveRecord`.

**Sizes are in two different units and the control converts between them.**
`filesize` on the Note row is in **bytes**; the platform's file API wants **KB**.
The size shown in the list comes from the row; the size handed to the download
comes from the bytes actually being transferred.

**One feature is declared: WebAPI, and it is optional.** Optional rather than
required because a required feature the host cannot supply is a component that
fails to load rather than one that degrades — see *Canvas apps*.
