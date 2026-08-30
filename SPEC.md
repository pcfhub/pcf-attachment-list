# Attachment List

The notes and attachments on a record, with download.

Two platform calls, and **neither had been made anywhere else in this
catalogue**: `context.webAPI.retrieveRecord` and `context.navigation.openFile`.
Most of what follows is about the second one and about what a control owes a
host that cannot make either.

## What the build disagreed with

**A property-set role on the annotation table cannot be mapped correctly, and
0.1.0 shipped requiring one.** Reported from production on 2026-08-30:

    0x80041a08  Retrieve can only return columns that are valid for read.
                Column : dummyfilename. Entity : annotation

The subgrid’s own FetchXML carried `<attribute name="dummyfilename"/>` beside
the default view columns, so the failure was the LIST, not the download, and
nothing rendered at all.

The cause, from the Dataverse annotation table reference:

| Logical name | Display name | IsValidForForm | IsValidForRead |
| --- | --- | --- | --- |
| `dummyfilename` | File Name(deprecated) | **true** | **false** |
| `filename` | File Name | false | true |
| `filesize` | File Size (Bytes) | false | true |
| `mimetype` | Mime Type | false | true |
| `isdocument` | Is Document | false | true |
| `subject` | Title | false | true |

A form-side column picker offers columns whose metadata says
`IsValidForForm: true`. On this table that is exactly one file-related column,
and it is the deprecated placeholder Dataverse will not read. **So every one of
the six roles was unmappable, and the required one took the whole control down
when a maker did the only thing the designer allowed.**

Half of the 0.1.0 reasoning was right: a mapped role *does* force its column
into the query. That is precisely what made it fatal.

0.1.1 inverts it. `dataset.addColumn` is the mechanism and roles are an
override for custom attachment tables; every role is optional; and a role
mapped to `dummyfilename` is refused by name with a message that says what to
clear. **A required setting that cannot be satisfied through the tool that sets
it is a control that cannot be installed**, which is the general lesson.

**Why the rig could not have caught it.** `dev/fixture.js` set
`alias: fileNameColumn` with `name: filename` — a correct mapping. No harness
knows which columns a form designer will offer, because that is metadata about
the table rather than data in it. The fixture now carries a `defaultView` with
neither, a `catalogue` of columns that exist but are not selected, and a
`deprecated` view that maps the bad column.

**PCF cannot bind a File column, so attachments have to be Note rows.** The
manifest schema reference says so outright under the `type` element — *"At this
time File columns are not supported"* — `ImageObject` is documented canvas-only,
and `context.webAPI` has five methods, none of which can PATCH a file attribute.
`pcf-file-drop` reached the same wall from the other side and answered it by
storing a data URL in a text column. This control answers it by not owning the
storage at all: `annotation` rows already hold the bytes, and the Notes subgrid
already lists them.

**`retrieveRecord`'s options string is restricted to `$select` and `$expand`**
by its own doc comment — no `$filter`, no `$top`. That is enough here, because
everything except the body is already on the dataset row and asking again would
be a second source of truth for values the view supplied.

**`FileObject` is one type used in both directions.** `device.pickFile` resolves
with it and `navigation.openFile` takes it, which reads as symmetry and hides a
trap: `fileSize` is in **KB**, while `annotation.filesize` beside it is in
**bytes**. `pcf-file-drop` already documents `fileSize` as the field of that
interface that reads like it means something else; this control has to convert
between the two units in the same function.

**`openMode` is required inside `OpenFileOptions`.** `openFile(file, {})` does
not compile, and omitting the options object entirely defaults to `1` — Open,
not Save. A button that says Download and asks the host to *open* renders a PDF
inline and saves a `.zip`, which is the same button doing two different things
depending on the row.

## Platform behaviour worth knowing

**A `webAPI` rejection is not an `Error`.** It is a plain object carrying
`errorCode` and `message`, exactly as the Client API's `errorCallback`
documents — so `error instanceof Error ? error.message : String(error)` falls
through to `String({…})` and renders the literal `[object Object]` where the
platform's explanation belongs. Taken verbatim from `pcf-lookup-search`, where
it was found on a real form. **The rig models it too**: `dev/host.js` rejects
with a plain object, because a stub that rejected with an `Error` would pass a
control that renders `[object Object]` everywhere it matters.

**`required="false"` on a `<uses-feature>` is the difference between degrading
and not starting.** The documented behaviour of `required="true"` on a host that
lacks the feature is a design-time warning and *component load failure at
runtime* — not a null accessor to check. Quoted from `pcf-kanban-board`, which
made the same call for the same reason.

**The two halves of "can this host download" are absent for different reasons
and both have to be checked.** `context.webAPI` is missing in canvas and on any
host that did not grant the optional feature. `context.navigation.openFile` is
documented model-driven apps only — and `context.navigation` itself is present
either way, since `openUrl` and `openAlertDialog` are — so a control that checks
the bag rather than the method passes on a host that cannot open a file.

**Refusing a large file has to happen before the fetch.** `retrieveRecord`
returns a bare promise: no streaming, no abort. A 200 MB attachment arrives as
one base64 string in memory and there is no refusing it at that point. The
ceiling is therefore checked against the row's declared `filesize`, which is the
only number available before the call.

**A download cannot be cancelled, only disowned.** `destroy()` sets a flag and
every continuation checks it. That is weaker than `pcf-file-drop`'s
`FileReader.abort()` and it is worth saying rather than implying: the request
still completes somewhere, it simply no longer reaches a control.

**`getFormattedValue` is right for almost everything here and wrong for the
size.** The date has to be in the user's locale and time zone and this control
has no business re-deriving that; the subject and file name are strings the
platform already formatted. But `filesize` is a `Whole.None` column, so its
formatted value is a byte count with a group separator — `"1,048,576"` — which
is correct and unreadable. The size is the one value read with `getValue` and
formatted by the control.

**`getFormattedValue` on a `TwoOptions` returns "Yes"/"No"**, which is a
translation trap: `isdocument` is read with `getValue` and normalised, or the
control would work in English only.

## The dev rig

Three additions here, all **promoted to `_template/variants/dataset/dev/host.js`
in the same change**:

1. **A `webAPI` stub whose refusals are the interesting part.** `retrieveRecord`
   answers from the fixture row, and the four outcomes are expressed by what
   that row carries: a string is a file, `''` is a zero-byte file, `undefined`
   is a column nobody populated, and `null` rejects. One place describes each
   row, and a control that handles only one of the middle two fails here.
2. **A `navigation` stub recording `openFile`**, with its own switch, so the
   model-driven-only half can be removed independently of the Web API.
3. **`addColumn` that behaves like the platform’s**: it records the request,
   and the column arrives on the NEXT fetch rather than in the call — a stub
   that added it synchronously would pass a control that never refreshed. Only
   a column in the fixture’s `catalogue` can arrive, because a real table
   returns nothing for a name that is not one of its own. `hasAddColumn`
   removes the method, since it is typed optional.

**The suite is asynchronous below the divider**, and `report()` is called from
the end of that block rather than from the top level — otherwise a rejected
promise could exit the process before the suite says what happened.

## Demo

`fidelity: "limited"`. Everything except the download is real in the harness,
and the download is the point: the bytes come from a Dataverse the harness does
not have, and `openFile` is model-driven only. Pressing Download there produces
the control's genuine degraded behaviour — the output property is set, and a
line says downloading needs a model-driven app.

Not `mocked`, which would tell a visitor to expect a file.

## Not verified


**That `navigation.openFile` saves anything at all**, and that a 32 MB base64
string survives the round trip without stalling the tab. Read from the type
definitions and from Microsoft Learn; never run.

**That the WebAPI permission prompt appears once at import and is not asked
again**, and what a maker sees if they decline it.

**That `getTargetEntityType()` on a Notes subgrid returns `annotation`** rather
than the parent table. The download is addressed with it, so a wrong answer is a
download that 404s on every row.

**That the four glyphs are legible at 20px in both themes**, and that the
stylesheet applies at all on a real form.

**That a text note with a file name is rare enough** for the `isDocumentColumn`
fallback to be acceptable when the role is unmapped.

## Promoting a finding

The skill's `## Files and binary content` section covers reading a file **in**
and says nothing about handing one back **out**. These belong there:

- `navigation.openFile`, its `FileObject`, `openMode: 2` for save, and the
  KB-versus-bytes conversion.
- `retrieveRecord`'s `$select`-and-`$expand`-only options string, and fetching a
  blob lazily rather than putting it on the view.
- Refusing a large payload before the call, because there is no abort.

And two for other sections: **`required="false"` versus load failure** belongs
beside the existing `<feature-usage>` material, and **"stub the refusals first"**
now has a second worked example in the dataset rig.
