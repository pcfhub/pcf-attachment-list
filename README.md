# Attachment List

The notes and attachments on a record, with download.

[![Build](https://github.com/pcfhub/pcf-attachment-list/actions/workflows/build.yml/badge.svg)](https://github.com/pcfhub/pcf-attachment-list/actions/workflows/build.yml)
[![Release](https://github.com/pcfhub/pcf-attachment-list/actions/workflows/release.yml/badge.svg)](https://github.com/pcfhub/pcf-attachment-list/actions/workflows/release.yml)

Documentation lives on [PCFHub](https://pcfhub.dev/components/pcf-attachment-list), built
from the `docs/` directory in this repository. Edit the Markdown here; the hub
recompiles it.


## What it does

Point it at a Notes subgrid and it lists what is on the record — the files with
a glyph, a size and a date, the text notes alongside them — and puts a Download
button on every row that has a file behind it.

The out-of-the-box Notes control is a timeline, built for reading a conversation
with the attachments hanging off the messages. This inverts that: a file list,
for the forms where the documents are the point.

Four decisions are worth knowing before you read the code.

**The list and the bytes come from different places.** A file body is a base64
blob, and a view that selected it would download every attachment on the record
every time the form opened. So the view supplies the list and
`context.webAPI.retrieveRecord` supplies one body, on the press. **No control
in this catalogue had called `retrieveRecord` before this one, and none had
called any `navigation` method except `openForm`.** Both of this control's
platform calls are first-of-kind here.

**Both of those calls are optional at runtime, for different reasons.**
`context.webAPI` is absent in canvas and on any host that did not grant the
`required="false"` feature; `navigation.openFile` is documented model-driven
apps only, and `context.navigation` itself is present either way — so the check
is on the method, not on the bag. A press therefore sets `downloadedRecordId`
and notifies **first**, which is the only download route canvas has, and only
then tries the round trip.

**Six `property-set` roles, not a read of `dataset.columns`.** The
out-of-the-box Notes associated view carries `subject`, `notetext`,
`createdon` and `modifiedby` — not `filesize`, `mimetype` or
`isdocument`. A control matching hardcoded logical names would find no size, no
type and no way to tell a file from a note on the most common configuration
there is, and would fail *silently*. Roles put the column in the query, and they
let the download read `dataset.getTargetEntityType()` instead of the string
`annotation`, so a custom attachment table works unchanged.

**Text notes are listed, not dropped.** An `annotation` with
`isdocument = false` has no name, no body and no size. A control that replaces
the Notes subgrid and silently hides half of what is on the record leaves the
user unable to tell "nothing more" from "this is hiding things".

## Properties

The six columns the control reads are `property-set` roles on the dataset. A
role is *found* on the column by its manifest name and read off the record by
the schema name the maker mapped to it.

| Role | Type | Required | Without it |
| --- | --- | --- | --- |
| `fileNameColumn` | SingleLine.Text | **yes** | Nothing is listed, and the control says so |
| `fileSizeColumn` | Whole.None | no | No size line |
| `mimeTypeColumn` | SingleLine.Text | no | `application/octet-stream` |
| `isDocumentColumn` | TwoOptions | no | A non-empty file name means "is a file" |
| `subjectColumn` | SingleLine.Text | no | The file name is the heading |
| `createdOnColumn` | DateAndTime | no | No date line |

| Property | Type | Usage | Default | What it controls |
| --- | --- | --- | --- | --- |
| `bodyColumn` | SingleLine.Text | input | `documentbody` | The logical name of the column holding the bytes |
| `hideTextNotes` | TwoOptions | input | `false` | Show only rows carrying a file |
| `maxDownloadSizeMb` | Whole.None | input | `32` | Refused **before** the fetch, on the row's declared size |
| `pageSize` | Whole.None | input | `25` | Rows per page; clamped to 250 |
| `downloadedRecordId` | SingleLine.Text | **output** | — | The row whose download was last requested |

`bodyColumn` is a property rather than a role because it is deliberately *not*
on the view. It is interpolated into a query string, so it is validated against
`/^[a-z][a-z0-9_]*$/` and falls back to the default; a merely *wrong* logical
name is let through, so the server's own message names it.

`hideTextNotes` defaults `false`, which is the `TwoOptions` trap — a manifest
`default-value="false"` reaches the hub's harness as the string `"false"`, and
`Boolean("false")` is `true`. It is read through a normaliser, and every preset
sets it explicitly.

**One `<feature-usage>` entry: WebAPI, `required="false"`.** Required on a host
that lacks the feature is *component load failure at runtime*, not a null
accessor to check — so `false` plus feature detection is the difference between
a list that degrades and a control that will not start.

Strings ship in five languages — 1033 English, 3082 Spanish, 1036 French, 1031
German, 1041 Japanese. No framework is bundled: it is a `standard` control
writing DOM and inline SVG, reading Fluent's design tokens through `var()` with
literal fallbacks.

## On the hub

`demo.fidelity` is **`limited`**, and the line is easy to draw: everything
except the download is real, and the download is the point.

The list, the four file-type glyphs, the size formatting, the titles, the dates,
the text-note rendering and hiding them again all behave in the harness exactly
as they do on a form. What the harness cannot be is a Dataverse. A file's bytes
are not on the view — they come from `context.webAPI.retrieveRecord`, which the
harness does not supply, and go to `context.navigation.openFile`, which is
model-driven only. So pressing Download there does what the control does on any
host that cannot deliver a file: reports the press through its output property
and says so in words. That is the real degraded path rather than a broken one,
which is why `limited` and not `mocked` — `mocked` would tell a visitor to
expect a file.

Two presets: **Notes and files**, which is what a Notes subgrid actually holds,
and **Files only**, which is the same record with the text notes hidden. Every
input property is set in both.

## Install

Download the managed solution from the
[latest release](https://github.com/pcfhub/pcf-attachment-list/releases/latest), or from
the component's page on the hub, and import it into your environment.

## Develop

```bash
npm install
npm start          # the PCF test harness
npm run build
npm run lint
npm run check      # what CI runs first: placeholders, pcfhub.json, control shape
npm run smoke      # assertions against the built bundle — see dev/
npm run harness    # serves dev/harness.html and opens it
```

`npm start` renders the control; `dev/` is for the states it cannot reach. Build
first, then `npm run smoke` for the assertions, or `npm run harness` for the
switches — field-level security, a failed business rule, a host that publishes
no theme or no column metadata, and for a dataset control, more than one page.
Both read the bundle `npm run build` wrote, and both are described in the header
of `dev/smoke.js`.

`npm run harness` serves the repository over `http://` rather than leaving you to
open the file: over `file://` a dataset fixture cannot be fetched and a module
script is refused, and both arrive as an empty control with a CORS error. It
takes `--port` and `--no-open`, and needs no dependency — `dev/serve.js` is
`node:http`. A React (virtual) control has no harness page, and the script says
so rather than serving a 404.

Run `npm run refreshTypes` after every manifest edit — until you do,
`context.parameters` is typed from the old manifest and `tsc` will accept code that
cannot work.

To pack the solution locally you need msbuild — either Visual Studio or the
Visual Studio Build Tools:

```bash
cd Solution
msbuild /t:build /restore /p:configuration=Release
```

Both zips land in `Solution/bin/Release`. This is the only local step that compiles
in **production** mode, so a green `npm run build` is not evidence the shipping
bundle compiles — and the pack is incremental, so delete `obj/`, `out/`,
`Solution/obj/` and `Solution/bin/` first if you intend to quote a bundle size from
it.

## Release

1. Bump the version in **three** places, in one commit — they are checked
   against each other in CI:
   - `AttachmentList/ControlManifest.Input.xml` → `<control version="…">`
   - `Solution/src/Other/Solution.xml` → `<Version>`
   - `package.json` → `"version"`
2. Tag it: `git tag v1.2.3 && git push --tags`

The release workflow builds, packs both solution types, and attaches them to a
GitHub Release. PCFHub picks the release up from its webhook within seconds, or
from the hourly sweep otherwise. A sync imports a draft; a person publishes it.

## Repository layout

| Path | What it is |
| --- | --- |
| `AttachmentList/` | The control: manifest, entry point, CSS, localised strings |
| `Solution/` | The Dataverse solution that packages it |
| `dev/` | A stand-in host: `npm run smoke` asserts, `harness.html` shows |
| `SPEC.md` | What building this corrected, and what is verified versus read |
| `docs/` | The pages PCFHub publishes — see the comments in each file |
| `media/` | Images and video referenced from the docs |
| `pcfhub.json` | The hub's manifest: identity, links, docs path, demo |
| `scripts/` | Template setup and the CI guard that keeps it adopted |

## Licence

[MIT](LICENSE)
