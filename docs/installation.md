---
title: Installation
description: Import the solution and make the control available.
order: 2
---

# Installation

<!--
  Do not link to the release assets by hand. The hub serves the managed and
  unmanaged downloads for the version the reader is viewing, and a hard-coded
  link goes stale on the next release.
-->

:::steps
1. Download the **managed** solution for your environment.
2. In the Power Platform admin centre, import the solution.
3. Publish all customizations.
4. Enable **Code components for canvas apps** if this control is used there.
:::

:::callout{type=warning}
Import the managed solution into production. The unmanaged one is for a
development environment where you intend to change the control itself — it
cannot be cleanly uninstalled.
:::

## Requirements

The control asks for one permission at import: **WebAPI**. It is used for
three calls and nothing else — reading the body of the file being downloaded,
creating the Note for a file being attached, and reading the organisation's
attachment size limit once so an oversized file can be refused before it is
read. There is nothing else to install, and no framework is bundled.

It deliberately asks for nothing more. The file picker is an ordinary file
input rather than the device API, and the table metadata an upload needs is
read through the organisation's own Web API endpoint, which needs no feature —
so there is one prompt, not three.

For canvas apps, code components must be enabled in the environment. Note that
neither downloading nor uploading works there; see *Canvas apps*.
