# Attachment List

The notes and attachments on a record, with download — and, since 0.2.0, upload.

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


---

# 0.2.0 — upload

The other direction. Files dropped on the list, or picked through *Add files*,
become Note rows through `webAPI.createRecord`, one at a time, with one refresh
at the end. Picked by a demand survey rather than by the template audit:
attachment upload is the most-repeated single control in the community's
starred ranking (`AttachmentUploader` 21★, BeverCRM's two drag-and-drop
uploaders behind it, every 2026 write-up a multi-file upload), and this
catalogue's Notes control could read and download but not add.

**Written before the walkthrough, then closed by it on 14 September.** The
0.1.2 build was the probe — the feature was the question — and every
load-bearing answer is under *Measured* below. 0.2.0 is the same build with
one label fixed.

## What the build disagreed with

**The skill's "`device.pickFile` first" rule, for this shape.** The rule is
right for `pcf-file-drop` — one file, into a column, where a phone's camera
roll is the point. For several files into Notes it costs a second install-time
prompt and buys a picker whose `accept` is three words. A hidden
`<input type="file" multiple>` exists on every host with a DOM, honours the
full `accept` rule, and on a phone opens the same roll. So no `Device.pickFile`
feature is declared, and the manifest says why. The same reasoning kept
`Utility` out: `getEntityMetadata` would have been a third prompt for one
string that a same-origin fetch reads without one.

**0.1.x's live region was clipped to a pixel, and that was a defect.** It read
as tidy — a status region "for screen readers" — and it meant a sighted user
who pressed Download on a row the server refused saw nothing happen at all.
The platform's explanation reached only assistive technology. An upload has
more to say, so the region is now a visible line under the list, empty and
zero-height most of the time. `pcf-lookup-search` renders its errors inline
for the same reason; this control had copied the pattern from the template's
*sr-only* status and never looked at it.

**A `default-value` on the ceiling would have been an override, again.** The
platform already has the number Dataverse will enforce on the create —
`organization.maxuploadfilesize`, 5 MB out of the box, raised by an admin — so
`maxUploadSizeMb` carries no default and, unset, reads it once. The same rule
`pageSize` follows, and the Gap Map's "if the platform already has an answer,
read it" stated a third time. A read that fails answers *no ceiling* rather
than 5 MB: an admin who raised the limit should not be told a file is too big
by a control that could not find out.

## Platform behaviour this rests on

All of it read from Microsoft Learn and from `pcf-data-table` 0.5.0's
measurements, none of it yet watched on a form. See *Not verified*.

**A Note with a file is one `createRecord` on `annotation`** — `filename`,
`mimetype`, `isdocument: true`, `documentbody` as **bare base64** (no `data:`
prefix — the opposite of `pcf-file-drop`'s text column, which keeps the whole
data URL), and `objectid_<table>@odata.bind` naming the parent as
`/<entityset>(<guid>)`. `filesize` is the server's to compute. No `subject`,
which matches the platform's own *New note with attachment*: the file name is
the title until somebody gives it one.

**`objectid` is polymorphic, and the navigation property is per table.** The
annotation table carries one many-to-one relationship per table that has
Notes, each with its own `ReferencingEntityNavigationPropertyName` —
`objectid_account`, `objectid_contact`, `objectid_cll_account`. The name is
*not* derivable by rule: 0.5.0 measured a lookup's navigation property as the
logical name on one table where the documentation implies the schema name. So
the control reads `EntityDefinitions(LogicalName='annotation')/ManyToOneRelationships`
once and picks the row whose `ReferencedEntity` is the parent's table.

**The entity set name is not derivable either**, and the control reads
`EntityDefinitions(LogicalName='<parent>')?$select=EntitySetName` for it.
`account` → `accounts` is the easy case; `category` → `categories` and a custom
`cll_account` → `cll_accounts` are why nobody should pluralise by hand.

**The parent comes from `mode.contextInfo`**, measured on a form subgrid by
0.4.0 as `{ entityTypeName, entityId, entityRecordName }` with the GUID
unbraced, and `null` on a main grid. Braced upper-case GUIDs are stripped and
lowered anyway, because a dialog's GUID arrives that way and the bind value
takes bare.

**Blocked extensions are the environment's, not the control's.** Dataverse
refuses a blocked `.exe` on the create, after the body has been sent. The
control does not duplicate the block list; it renders Dataverse's own message.

## The dev rig

Four additions, all **promoted to `_template/variants/dataset/dev/host.js`
in the same change**, and one repair:

1. **`webAPI.createRecord` that holds the row until the next fetch.** Same
   split as `deleteRecord`'s `removedPending`: the call resolves an id, and a
   control that forgets `dataset.refresh()` draws a list one row short — which
   is what a real form does. A row lands in *this* dataset only when created on
   the bound table. `@odata.bind` keys are resolved through
   `fixture.relationships` and refused the way `updateRecord` refuses them;
   `fixture.computed(data)` supplies what the server would (`filesize`,
   `createdon`), because the server's columns are the table's business and the
   fixture is where the table lives; `fixture.bodyColumn` lifts the body onto
   `row.body`, so the file just uploaded downloads back through the same
   `retrieveRecord` stub — the suite proves the round trip rather than assuming
   it.
2. **`webAPI.retrieveMultipleRecords`** answered from `fixture.tables`, with
   `$select` and `$top` honoured — for the *other* table a control reads once.
3. **`EntityDefinitions(LogicalName='x')?$select=EntitySetName`** answered by
   the fetch stub from `fixture.entitySets`; an unknown table 404s the way the
   server does, and `entitySetAbsent` answers 200 with the property missing.
4. **A canvas host withholds `webAPI` and `openFile` however the switches are
   set**, on the same rule as `utils` and `page`. A rig that could be told
   "canvas, with a Web API" would pass a control that works nowhere; this one
   could, and the canvas screenshot showed the download note missing before the
   rule went in.

**The repair: the fetch stub belonged to the last host created.** Installed
per host onto the one global `fetch`, it answered another host's read from the
wrong fixture and logged it on the wrong call list. Found by this suite —
which binds five views and then drops a file on the first — as "the create
succeeded and the two fetches were never made". Each host now answers a URL
of its own (`https://rig2.crm.invalid`, …) and one global stub routes by
origin. Every prior dataset suite in the catalogue bound one view before
fetching, which is why it was never hit.

**Three assertions were mutation-tested**, and the first attempt was the trap
the skill describes: the mutation tripped `no-unused-vars`, `pcf-scripts
build` exited 0 with no bundle, and 89 assertions passed against the previous
build. Confirmed by `md5sum` of the bundle before believing any of the three.
Restated lint-clean, the base64-prefix mutation failed one assertion, and the
drop-`preventDefault` plus never-refresh mutation failed six.

## Demo

Still `limited`, and the upload adds a reason: the hub's harness has no Web
API and no parent record, so there is no *Add files* button on the public page
and a dropped file is declined in words — the same as a main grid. Said in
`demo.limitations`. `mocked` would tell a visitor to expect a row.

## Screenshots

`media/screenshot*.png` are rendered by headless Chrome against a scratch
page that mounts the built bundle on `dev/host.js` with `demo/records.json`,
a parent record, and a two-file drop already made — one taken, one over the
ceiling — so the outcome line is in the shot. 720 CSS px wide at
`--force-device-scale-factor=2`, `--virtual-time-budget=5000`. The canvas shot
uses `host: 'canvas'`. The page is not in `dev/`; rebuild it from this
paragraph if it is needed again.

## Measured

On the Accounts form's Notes subgrid, 14 September 2026, `pcfhub_PCFHub.AttachmentList`
at 0.1.2 confirmed through `customcontrols` before anything was dropped.

**`createRecord('annotation', …)` with `objectid_account@odata.bind` succeeds
from `context.webAPI`**, and the row is on the subgrid after the control's
own `refresh()`. Four files went in — `test.txt`, `README.md`,
`screenshot.png`, `vasos devolver.pdf` — each listed with its size and the
server's `createdon`, each downloadable back. No prompt beyond the one
`WebAPI` prompt 0.1.x already had.

**The navigation property is `objectid_account`**, read from
`EntityDefinitions(LogicalName='annotation')/ManyToOneRelationships`:
`{ ReferencedEntity: "account", ReferencingEntityNavigationPropertyName:
"objectid_account" }`. The logical-name convention held on the standard
table; the control still reads it, because 0.5.0 met a table where it did
not.

**`organization.maxuploadfilesize` is readable by an ordinary user through
the Web API**, and on this environment it is `8314880` — 7.9 MB, not the
5 MB default. A 7.9 MB refusal is what the control produced before reading a
byte of `Git-2.55.0.4-64-bit.exe`, which is the point of reading it. (0.1.2
printed "7 MB" for it; 0.2.0 prints 7.9.)

**`mode.contextInfo` is populated on the Accounts form's Notes subgrid** the
way 0.4.0 measured it on the custom-table subgrid — the create bound to the
right record, which is the only way the row could have appeared in it.

**A drop reaches the control inside the form iframe.** Files dropped on the
list were attached; the platform did not intercept the gesture above the
container. The picker also worked (*Add files* → four picked).

**The `accept` rule applies to a drop.** With `.pdf` set, `test (1).txt` was
refused by name under the list and nothing was created for it.

**The organisation's own refusal for a blocked extension was not exercised**
— the `.exe` was refused by size first.

## Not verified

**That the file input opens the camera roll on the model-driven mobile app.**
Desktop only so far. If a phone cannot pick, the `Device.pickFile` decision
above is wrong for phones and gets revisited.

**That a Note over the organisation's limit is refused by Dataverse with a
message worth showing**, for the case where the maker's ceiling is set higher
than the organisation's. The control refused first on this environment.

**That the visible status line does not double up with the platform's own
notification** for a create that fails — no create failed.

And from 0.1.x: that the WebAPI prompt appears once, and that
`getTargetEntityType()` on a custom attachment table returns its own name.
Both downloads and uploads addressed `annotation` correctly on this subgrid,
so the standard case is settled.

## The walkthrough

Closed 14 September; the answers are under *Measured*. Kept so the next
release can re-run it:

On the Accounts form, after importing as an upgrade and hard-reloading:

1. Confirm the version: `fetch("/api/data/v9.2/customcontrols?$select=name,version").then(r=>r.json()).then(d=>console.log(JSON.stringify(d.value.filter(c=>/AttachmentList/.test(c.name)),null,2)))`.
2. Drop a small `.txt` on the list. Expect the *Attaching 1 of 1* line, then
   *Attached name.*, then the row. Paste the network tab's `POST …/annotations`
   request body and the response status.
3. Press *Add files*, pick two files, one over 5 MB. Expect one attached and
   one refused by name with *5 MB*.
4. Set **Allowed file types** to `.pdf` on the form, publish, drop a `.txt`.
   Expect the refusal by type.
5. Download the row just attached. Expect the same bytes.
6. Open the Notes main grid with the control on it. Expect no button.
7. In the console, `fetch("/api/data/v9.2/EntityDefinitions(LogicalName='annotation')/ManyToOneRelationships?$select=ReferencedEntity,ReferencingEntityNavigationPropertyName").then(r=>r.json()).then(d=>console.log(JSON.stringify(d.value.filter(r=>/account/.test(r.ReferencedEntity)))))`
   and paste the result — the navigation property for the custom table is
   the load-bearing string.
8. `fetch("/api/data/v9.2/organizations?$select=maxuploadfilesize&$top=1").then(r=>r.json()).then(d=>console.log(JSON.stringify(d)))`
   and paste it.

Every answer goes under *Measured*; an answer that goes the wrong way removes
the feature that rests on it rather than being worked around. This time none
did, and nothing was cut — the fourth control on this form to go through
clean on its first walkthrough, after `pcf-data-table` 0.5.0.

## Promoting a finding

The skill's *Files and binary content* section covers reading a file **in**
to a text column and handing one **out**, and says nothing about the third
route — the one every community uploader takes: writing a file to Dataverse
**as a Note**. That was promoted in the same change, marked as read rather than measured;
the walkthrough closed the same day and the skill says *measured* now:

- `createRecord('annotation', …)`: the five keys, bare base64, no `subject`.
- The bind: navigation property and entity set both **read** from
  `EntityDefinitions` through a same-origin fetch — no `Utility` prompt.
- The ceiling: `organization.maxuploadfilesize`, read rather than defaulted.
- The picker: a file input over `device.pickFile`, and when each is right.
- The gestures: `dragover` prevented always (a dropped file otherwise
  navigates the frame), depth-counted `dragleave`, `types` not `files` during
  the drag.
- Sequential creates, one refresh, problems collected rather than announced.

And two for the rig: **a stub per host onto one global is a stub for the last
host**, and **a canvas host withholds what canvas withholds regardless of the
switches**.
