---
title: Canvas apps
description: What works in a canvas app, what does not, and how to download and attach anyway.
order: 3
---

# Using it in a canvas app

**The list works. The download and the upload do not, and cannot.**

Two platform APIs are involved and canvas has neither. `context.webAPI` is
Dataverse-dependent and is
[not available to canvas apps](https://learn.microsoft.com/power-apps/developer/component-framework/limitations),
so the file's bytes cannot be fetched and a Note cannot be created;
`context.navigation.openFile` is documented model-driven apps only, so even
with the bytes there is nothing to hand them to. There is no **Add files**
button in a canvas app, and a dropped file is declined in words.

::image{src=media/screenshot-canvas.png alt="The list rendered in a canvas app, with a line beneath it saying downloading needs a model-driven app" zoom}

The control does not refuse to start over that. It declares WebAPI as an
**optional** feature, detects both halves at runtime, and degrades: the notes
are listed exactly as they are on a form, a line under the list says downloading
needs a model-driven app, and every press is still reported.

:::steps
1. From **Insert → Get more components**, open the **Code** tab and import
   **Attachment List**.
2. Place it from **Insert → Code components**.
3. Set **Items** to the notes you want listed, and pick the six columns in the
   **Fields** flyout.
4. Handle `OnChange` if you want the download to do something.
:::

## Downloading it yourself

Every press sets the **Downloaded note ID** output before anything else is
attempted — including on a host that cannot download — so it is the one route
canvas has.

```powerfx
If(
    !IsBlank(AttachmentList1.DownloadedRecordId),
    Launch(
        "https://contoso.crm.dynamics.com/api/data/v9.2/annotations(" &
            AttachmentList1.DownloadedRecordId & ")/documentbody/$value"
    )
)
```

:::callout{type=warning}
That URL is illustrative rather than copy-and-paste: the environment host is
yours, and whether a browser can follow it depends on how the user is
authenticated. A Power Automate flow returning the file is the route that works
regardless, and is what most apps end up using.
:::

## Attaching it yourself

Canvas already has a better route than this control could offer: the
**Attachments** control on a form, or `Patch` against the Notes data source
with the file from an **Add picture** or a `pcf-file-drop`. That is why the
upload is not reimplemented here through an output property — it would be a
worse version of something the platform gives you.

## What the maker sees

Mapping the columns is the same job as on a form, but the mechanism is
different: canvas has no view, so the six roles come from the **Fields** flyout
on `Items` rather than from a view designer. A role nobody mapped is a role the
control cannot read — and **File name** is required, so until it is mapped the
control says so rather than rendering an empty box.

There is no field-level security in canvas and no column metadata, so nothing
here depends on either.
