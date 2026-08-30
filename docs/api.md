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

Six roles, none of them required, and on the Notes table you should leave all
six empty.

They are an **override** rather than the mechanism. Every column this control
needs on the `annotation` table is marked *not valid for form*, so a form-side
column picker cannot offer any of them — and the one it does offer for File
name, `dummyfilename`, cannot be read at all and fails the entire subgrid query
if mapped. The control therefore asks for its columns with
`dataset.addColumn` and finds them by logical name.

Map a role only for a custom attachment table whose columns are named something
else. See *Model-driven apps*.

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
