import { IInputs, IOutputs } from './generated/ManifestTypes';

type DataSet = ComponentFramework.PropertyTypes.DataSet;
type Column = ComponentFramework.PropertyHelper.DataSetApi.Column;

/** The SVG namespace. `createElement('svg')` makes an *HTML* element of that
 *  name: it parses, it appends, it occupies no space and draws nothing. */
const SVG_NS = 'http://www.w3.org/2000/svg';

/** The platform's ceiling on a page. Not in the type definitions. */
const MAX_PAGE_SIZE = 250;

/**
 * Each column this control reads, as a property-set role name and the
 * annotation logical name to fall back on.
 *
 * **The fallback is the mechanism and the role is the override**, which is the
 * opposite of how 0.1.0 had it. A form-side column picker offers only
 * columns whose metadata says `IsValidForForm: true`, and on the annotation
 * table every column below is `false` — while `dummyfilename`, which is
 * `true`, is `IsValidForRead: false` and takes the whole query down with it.
 * A maker therefore cannot map these roles correctly on a Notes subgrid even
 * if they want to. See the manifest.
 *
 * Roles still earn their place on a custom attachment table, where the
 * columns are named something else entirely.
 */
const COLUMNS = {
    fileName: { role: 'fileNameColumn', logical: 'filename' },
    fileSize: { role: 'fileSizeColumn', logical: 'filesize' },
    mimeType: { role: 'mimeTypeColumn', logical: 'mimetype' },
    isDocument: { role: 'isDocumentColumn', logical: 'isdocument' },
    subject: { role: 'subjectColumn', logical: 'subject' },
    createdOn: { role: 'createdOnColumn', logical: 'createdon' },
} as const;

type ColumnKey = keyof typeof COLUMNS;

/**
 * The column a form designer offers for “File Name” on the annotation table,
 * and the one thing that must never reach a query.
 *
 * Display name “File Name(deprecated)”, described by Microsoft as a “Dummy
 * attribute associated with the note attachment”, `IsValidForRead: false`.
 * Selecting it fails the entire retrieve with 0x80041a08 — not the column,
 * the whole subgrid.
 */
const UNREADABLE_COLUMN = 'dummyfilename';

/** What `openFile` is given when the row carries no MIME type: a type that
 *  makes the browser save rather than guess. */
const FALLBACK_MIME = 'application/octet-stream';

/** A Dataverse logical name, which is what may be interpolated into a query. */
const LOGICAL_NAME = /^[a-z][a-z0-9_]*$/;

/**
 * Call a platform method that might not work, and take `undefined` for an
 * answer.
 *
 * **A method existing is not a promise that it works.** Canvas publishes
 * `page.getClientUrl` and throws `Method not implemented.` when it is called —
 * measured on a real canvas app, 2026-09-21 — so a `typeof` guard tests the
 * wrong thing, and a synchronous throw is not something a caller can catch by
 * asking politely. It escapes the call, escapes `render`, and the studio shows
 * *Error loading control* in place of the list.
 *
 * Every host probe in this file answers "can this host do X?" with a value.
 * This is that contract for the one that has to call something to find out.
 */
function ask<T>(call: () => T): T | undefined {
    try {
        return call();
    } catch {
        return undefined;
    }
}

const KB = 1024;
const MB = 1024 * 1024;

/** The pager chevrons, on a 20×20 grid. */
const CHEVRON_PREVIOUS = 'M12.5 5 7.5 10l5 5';
const CHEVRON_NEXT = 'M7.5 5l5 5-5 5';

/**
 * Four glyphs, by what the file *is* rather than by its extension.
 *
 * Fluent's own 20px path data — `Document20Regular`, `Image20Regular`,
 * `DocumentTable20Regular`, `Note20Regular` — read out of
 * `@fluentui/react-icons` rather than eyeballed, and taken at the size they are
 * drawn for. Four because a glyph per MIME type is a lookup table nobody
 * maintains, and because the only question the icon has to answer at a glance
 * is "is this a picture, a spreadsheet, a document, or a note".
 */
const ICON_PATHS = {
    document:
        'M6 2a2 2 0 0 0-2 2v12c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V7.41c0-.4-.16-.78-.44-1.06l-3.91-3.91A1.5 1.5 0 0 0 10.59 2zM5 4a1 1 0 0 1 1-1h4v3.5c0 .83.67 1.5 1.5 1.5H15v8a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1zm9.8 3h-3.3a.5.5 0 0 1-.5-.5V3.2z',
    image:
        'M14 7.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0m-1 0a.5.5 0 1 0-1 0 .5.5 0 0 0 1 0M3 6a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3zm3-2a2 2 0 0 0-2 2v8q0 .56.28 1.02l4.67-4.59a1.5 1.5 0 0 1 2.1 0l4.67 4.59Q16 14.56 16 14V6a2 2 0 0 0-2-2zm0 12h8a2 2 0 0 0 1.01-.27l-4.66-4.58a.5.5 0 0 0-.7 0l-4.66 4.58A2 2 0 0 0 6 16',
    sheet:
        'M6 10.5C6 9.67 6.67 9 7.5 9h5c.83 0 1.5.67 1.5 1.5v4c0 .83-.67 1.5-1.5 1.5h-5A1.5 1.5 0 0 1 6 14.5zM8 15v-2H7v1.5c0 .28.22.5.5.5zm1-3h4v-1.5a.5.5 0 0 0-.5-.5H9zm0 3h3.5a.5.5 0 0 0 .5-.5V13H9zm-1.5-5a.5.5 0 0 0-.5.5V12h1v-2zM6 2a2 2 0 0 0-2 2v12c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V7.41c0-.4-.16-.78-.44-1.06l-3.91-3.91A1.5 1.5 0 0 0 10.59 2zM5 4a1 1 0 0 1 1-1h4v3.5c0 .83.67 1.5 1.5 1.5H15v8a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1zm9.8 3h-3.3a.5.5 0 0 1-.5-.5V3.2z',
    note:
        'M14 3a3 3 0 0 1 3 2.82v4.56a2 2 0 0 1-.47 1.28l-.12.13-4.62 4.62a2 2 0 0 1-1.24.58l-.17.01H6a3 3 0 0 1-3-2.82V6a3 3 0 0 1 2.82-3H14m0 1H6a2 2 0 0 0-2 1.85V14a2 2 0 0 0 1.85 2H10v-3a3 3 0 0 1 2.82-3H16V6a2 2 0 0 0-1.85-2zm1.78 7H13a2 2 0 0 0-2 1.85v2.93l.09-.07 4.62-4.62z',
} as const;

type IconName = keyof typeof ICON_PATHS;

/**
 * The two names a bind value needs, per parent table, and neither is
 * derivable from the logical name.
 *
 * The navigation property is what `@odata.bind` keys — `objectid_account`
 * for a Note on an account — and the entity set is what the value names:
 * `/accounts(<guid>)`. `pcf-data-table` 0.5.0 measured that a navigation
 * property is not the schema name by rule and not the logical name by rule,
 * so both are **read** from `EntityDefinitions` rather than guessed. See
 * `bindFor`.
 */
interface Bind {
    readonly navigationProperty: string;
    readonly entitySet: string;
}

/** What `mode.contextInfo` hands a form subgrid: the record it sits on. */
interface Parent {
    readonly entityTypeName: string;
    readonly entityId: string;
}

/**
 * The three host surfaces an upload needs, or `null` when any is missing.
 *
 * `webAPI.createRecord` is absent in canvas and on a host that withheld the
 * feature; `mode.contextInfo` is absent on a main grid, where there is no
 * record to attach to; and `page.getClientUrl` is what addresses the metadata
 * read. Presence is per method, not per bag, so each is detected on its own.
 */
interface UploadHost {
    readonly parent: Parent;
    readonly clientUrl: string;
    readonly create: (entity: string, data: Record<string, unknown>) => Promise<{ id: string }>;
}


/** The Dataverse default for `organization.maxuploadfilesize`. */
const DEFAULT_UPLOAD_CEILING = 5 * 1024 * 1024;

/** One row, resolved off the dataset before anything is drawn. */
interface Item {
    readonly id: string;
    readonly isFile: boolean;
    readonly fileName: string;
    readonly heading: string;
    readonly mimeType: string;
    /** Bytes, as the row declares them. `annotation.filesize` is in bytes. */
    readonly bytes: number;
    readonly created: string;
}

/**
 * The notes and attachments on a record, with download.
 *
 * **Two platform calls, and neither has been made anywhere else in this
 * catalogue.** The list comes from the bound view; the bytes do not. A file's
 * body is a base64 blob that no view would ever select — a view that did would
 * download every attachment on the record every time the form opened — so it is
 * fetched one row at a time, on the press, through `webAPI.retrieveRecord`, and
 * handed to `navigation.openFile`.
 *
 * **Both of those are optional at runtime, for different reasons**, and the
 * control is written around their absence rather than defended against it.
 * `context.webAPI` is absent in canvas and on any host that did not grant the
 * `required="false"` feature; `navigation.openFile` is documented model-driven
 * apps only. So a press always sets `downloadedRecordId` and notifies *first* —
 * which is the only download route a canvas app has — and only then tries the
 * round trip.
 *
 * **A note is not always a file.** An `annotation` with `isdocument = false` is
 * a plain text note with no name, no body and no size. Those rows are listed,
 * because a control that replaces the Notes subgrid and silently drops half of
 * what is on the record leaves the user unable to tell "no more notes" from
 * "this control hid them".
 *
 * **0.2.0 adds the other direction.** Files dropped on the list, or picked
 * through *Add files*, become Note rows through `webAPI.createRecord` — bare
 * base64 in `documentbody`, the name and MIME type beside it, and an
 * `@odata.bind` to the record the subgrid sits on. The two names that bind
 * needs are read from `EntityDefinitions`, not derived, and the ceiling a
 * file is refused against is the organisation's own unless the maker set one.
 * The button is drawn only where the host can perform the write: an editable
 * model-driven form, with a parent record, on a host that granted the Web API.
 * Everywhere else the list is exactly what 0.1.x was.
 */
export class AttachmentList implements ComponentFramework.StandardControl<IInputs, IOutputs> {
    private container!: HTMLDivElement;
    private status!: HTMLParagraphElement;

    private notifyOutputChanged!: () => void;

    /** The Note most recently created. `''` rather than `undefined`, as above. */
    private uploadedRecordId = '';

    /**
     * Files waiting to be attached, in the order they arrived.
     *
     * One at a time, on purpose: a base64 body is a third larger than the file
     * and lives in memory until the create resolves, and ten parallel creates
     * against one record is how a subgrid gets ten refreshes. The queue is
     * drained by `drain`, and a drop while it is running joins the end.
     */
    private queue: File[] = [];
    private draining = false;

    /** The read in flight, which `destroy()` owes an `abort()`. */
    private reader: FileReader | null = null;

    /**
     * `dragenter`/`dragleave` fire for every child the cursor crosses, so a
     * flag flickers off while still over the list. A depth counter is the
     * standard fix and the only one that works.
     */
    private dragDepth = 0;

    /** The organisation's attachment ceiling in bytes, fetched once; `null` when it could not be read. */
    private ceiling: Promise<number | null> | null = null;

    /** The bind names per parent table, fetched once each. */
    private binds = new Map<string, Promise<Bind>>();

    /** The hidden file input the *Add files* button opens. */
    private picker: HTMLInputElement | null = null;

    /**
     * The context most recently handed down, for the upload that runs after
     * the render that started it. **Never the dataset**: `parameters.records`
     * is a new object every pass, and one kept from an earlier `updateView` is
     * a dead snapshot (`pcf-data-table` 0.5.0 measured it), so the queue reads
     * `this.latest.parameters.records` at the moment it needs it.
     */
    private latest!: ComponentFramework.Context<IInputs>;

    /**
     * The row most recently asked for.
     *
     * Never `undefined`: the generated `IOutputs` types it optional, and
     * `undefined` means "no change" to the platform — so a nullish default here
     * would make a press unobservable to a canvas app, which is the only route
     * canvas has. Starts as the empty string and is only ever assigned a string.
     */
    private downloadedRecordId = '';

    /** See the template: guarded on what *this control* asked for. */
    private appliedPageSize = 0;

    /**
     * The logical names already handed to `addColumn`.
     *
     * Guarded on the asking rather than on the answer, because a host that
     * ignores `addColumn` would otherwise be asked again on every render.
     */
    private requested = new Set<string>();
    private page = 1;

    /** Which chrome button to put focus back on after the next render. */
    private restoreFocus: 'previous' | 'next' | null = null;

    /**
     * The record id of the download in flight, or `''`.
     *
     * One at a time: a double-click on the same row would otherwise fetch the
     * same multi-megabyte body twice, and `retrieveRecord` has no abort.
     */
    private pending = '';

    /**
     * Set by `destroy()`.
     *
     * `retrieveRecord` returns a bare promise with no cancellation, so the
     * control cannot stop a request it has made — only refuse to act on the
     * answer. Weaker than `pcf-file-drop`'s `FileReader.abort()`, and worth
     * knowing about rather than papering over.
     */
    private disposed = false;

    public init(
        _context: ComponentFramework.Context<IInputs>,
        notifyOutputChanged: () => void,
        _state: ComponentFramework.Dictionary,
        container: HTMLDivElement,
    ): void {
        this.notifyOutputChanged = notifyOutputChanged;
        this.container = container;
        this.container.classList.add('AttachmentList');

        this.status = document.createElement('p');
        this.status.className = 'AttachmentList-status';
        /*
         * Polite. A download that has started is not an interruption, and a
         * failure is read after the click that caused it rather than instead of
         * something else.
         */
        this.status.setAttribute('role', 'status');
        this.status.setAttribute('aria-live', 'polite');

        /*
         * The whole control is the drop target, and the listeners go on the
         * container the platform hands over rather than on anything rendered,
         * because `render` empties the container on every pass and a listener
         * on a child would go with it. Taken in `init`, released in `destroy`.
         *
         * `dragover` MUST call `preventDefault()` or `drop` never fires at all
         * — silently, with a no-entry cursor and nothing in the console. The
         * most common reason a drop target does nothing.
         */
        this.container.addEventListener('dragenter', this.onDragEnter);
        this.container.addEventListener('dragover', this.onDragOver);
        this.container.addEventListener('dragleave', this.onDragLeave);
        this.container.addEventListener('drop', this.onDrop);
    }

    public updateView(context: ComponentFramework.Context<IInputs>): void {
        this.latest = context;

        this.applyTheme(context);
        this.applyPageSize(context, context.parameters.records);

        /*
         * Asking for a column is a mutator like `setPageSize`: it does nothing
         * until the next fetch, so it has to be followed by `refresh()` — and
         * `refresh()` fires `updateView`. `requestColumns` is guarded on what
         * has already been asked for, which is what stops that being a loop.
         */
        if (this.requestColumns(context.parameters.records)) {
            context.parameters.records.refresh();
        }

        this.render(context);
    }

    public getOutputs(): IOutputs {
        return {
            downloadedRecordId: this.downloadedRecordId,
            uploadedRecordId: this.uploadedRecordId,
        };
    }

    public destroy(): void {
        this.disposed = true;
        this.pending = '';

        // A read still in flight would call back into a container the
        // platform has thrown away. The queue behind it is simply dropped:
        // there is nothing to attach the rest to any more.
        this.reader?.abort();
        this.reader = null;
        this.queue = [];

        this.container.removeEventListener('dragenter', this.onDragEnter);
        this.container.removeEventListener('dragover', this.onDragOver);
        this.container.removeEventListener('dragleave', this.onDragLeave);
        this.container.removeEventListener('drop', this.onDrop);

        // Listeners are on elements inside `container`, which the platform
        // removes — but the container itself is reused, so clear it.
        this.container.innerHTML = '';
    }

    /**
     * Picks which set of colour fallbacks the stylesheet uses. Only the
     * fallbacks: where the host publishes Fluent's tokens this changes nothing.
     * Absent means absent — no class, light fallbacks, the same guess the host
     * made by not saying.
     */
    private applyTheme(context: ComponentFramework.Context<IInputs>): void {
        const isDarkTheme = context.fluentDesignLanguage?.isDarkTheme;

        if (isDarkTheme === undefined) {
            return;
        }

        this.container.classList.toggle('AttachmentList--dark', isDarkTheme);
    }

    /** Ask for a page size, but only when it actually changed. */
    private applyPageSize(context: ComponentFramework.Context<IInputs>, dataset: DataSet): void {
        const raw = context.parameters.pageSize.raw;

        /*
         * **The platform already has a page size, and it is usually the right
         * one.** `paging.pageSize` is the size the host is actually retrieving
         * with — a main grid's *Rows per page* personalisation, a subgrid's
         * form-designer setting, the canvas default.
         *
         * So the property carries no `default-value`, and this is the half of
         * that decision written in code: unset, adopt what the host is doing and
         * **never call `setPageSize` at all**; set, override. Adopting still
         * records the number, because the page slice and the pager label both
         * need to know how big a page is — reading it is not the same as asking
         * for it. See the manifest for why the default was removed.
         */
        if (raw === null || raw === undefined) {
            // `0` is "the host did not say", not "one row per page". A fallback
            // of `1` is a page size the platform never has, and the slice would
            // cut the view down to it — twenty rows arriving and one drawn.
            this.appliedPageSize = dataset.paging.pageSize > 0 ? dataset.paging.pageSize : 0;

            return;
        }

        const wanted = Math.min(Math.max(Math.trunc(raw), 1), MAX_PAGE_SIZE);

        if (wanted === this.appliedPageSize) {
            return;
        }

        const previous = this.appliedPageSize;

        this.appliedPageSize = wanted;
        dataset.paging.setPageSize(wanted);

        /*
         * **Repaginating makes "page 4" mean something else**, so the reader
         * goes back to the first page — the same move `sortBy` makes, and for
         * the same reason. Any change to the shape of the result set — a sort,
         * a filter, a page size — resets the page.
         *
         * **Only when it changed, though.** `previous` is 0 until a size has
         * been applied, and at mount the platform is already on page one, so
         * resetting there is a round trip bought for nothing: `reset()` is a
         * fetch in its own right and the `refresh()` below is a second one.
         *
         * Left out entirely at first, and close to unfalsifiable while the size
         * comes only from a manifest property: a property changes once, at
         * configuration time, almost always while the reader is on page one.
         * `pcf-data-table` 0.2.0 made it reachable with a rows-per-page picker,
         * and asked for page 3 of a result set that had just been recut.
         */
        if (previous > 0) {
            this.page = 1;
            dataset.paging.reset();
        }

        dataset.refresh();
    }

    private render(context: ComponentFramework.Context<IInputs>): void {
        const getString = (id: string): string => context.resources.getString(id);
        const dataset = context.parameters.records;

        this.container.innerHTML = '';

        // Canvas relies on this; a model-driven form hides the section itself.
        if (!context.mode.isVisible) {
            return;
        }

        /*
         * The one failure with a single findable cause, so it gets its own
         * message rather than the platform’s.
         *
         * A role mapped to `dummyfilename` fails the whole subgrid query with
         * 0x80041a08, and the platform’s own text names a column the maker has
         * never heard of — they picked something called “File Name”. Naming
         * the fix is the difference between a five-minute fix and a support
         * ticket.
         */
        if (this.mappedTheUnreadableColumn(dataset)) {
            this.message(getString('AttachmentList_DeprecatedColumn'), true);
            return;
        }

        if (dataset.error) {
            this.message(dataset.errorMessage || getString('AttachmentList_Error'), true);
            return;
        }

        const fileNameColumn = this.column(dataset, 'fileName');

        /*
         * Nothing to list against, and no way to ask for more: either the host
         * has no `addColumn` and the view carries no file name, or this is a
         * canvas app where the columns come from the Items Fields flyout and
         * the maker has not finished. An empty box tells them nothing.
         */
        if (!fileNameColumn) {
            this.message(getString('AttachmentList_NoFileNameColumn'));
            return;
        }

        const ids = this.currentPage(dataset.sortedRecordIds ?? []);
        const all = ids
            .map((id) => this.itemFor(dataset, id, fileNameColumn, getString))
            .filter((item): item is Item => item !== null);

        const hideNotes = asBoolean(context.parameters.hideTextNotes.raw, false);
        const items = hideNotes ? all.filter((item) => item.isFile) : all;

        /*
         * Above the list, and above the empty state too: a record with no
         * attachments yet is exactly where the button earns its place. Drawn
         * only where the host can perform the write — see `uploadHost` — so on
         * canvas, on a main grid and on a read-only form this line is nothing.
         */
        const toolbar = this.toolbar(context, getString);

        if (toolbar) {
            this.container.appendChild(toolbar);
        }

        if (items.length === 0) {
            /*
             * Three different facts, and they are not interchangeable. Loading
             * is true on the first updateView, before any record arrives, so
             * saying "empty" there would flash on every load. And "the view has
             * rows and you asked not to see them" is recoverable by unticking a
             * checkbox, which "there is nothing here" is not.
             */
            this.message(
                dataset.loading
                    ? getString('AttachmentList_Loading')
                    : all.length > 0
                      ? getString('AttachmentList_NoFiles')
                      : getString('AttachmentList_Empty'),
            );
            // The live region has to be on the page for an upload's progress
            // to be heard, and an empty record is where uploads start.
            this.container.appendChild(this.status);
            return;
        }

        const list = document.createElement('ul');
        list.className = 'AttachmentList-list';
        /*
         * A list, and named. A `<ul>` with no accessible name is announced as
         * "list, 6 items" with no clue what the six things are, and this
         * control is usually one of several regions on a form.
         */
        list.setAttribute('aria-label', dataset.getTitle() || getString('AttachmentList_ListLabel'));

        for (const item of items) {
            list.appendChild(this.row(context, dataset, item, getString));
        }

        this.container.appendChild(list);
        this.container.appendChild(this.pager(dataset, items.length, getString));
        this.container.appendChild(this.status);

        if (!AttachmentList.canDownload(context)) {
            /*
             * Said before the click rather than only after it. The button still
             * works — see `download` — but a user on a host that cannot deliver
             * a file should not have to press it to find out.
             */
            const note = document.createElement('p');
            note.className = 'AttachmentList-note';
            note.textContent = getString('AttachmentList_DownloadUnavailable');
            this.container.appendChild(note);
        }

        if (this.restoreFocus) {
            const selector = this.restoreFocus === 'previous' ? '.AttachmentList-previous' : '.AttachmentList-next';
            this.restoreFocus = null;

            const button = this.container.querySelector(selector) as HTMLButtonElement | null;

            if (button && !button.disabled) {
                button.focus();
            }
        }
    }

    /**
     * Resolve one column, in three steps.
     *
     *   1. a mapped role, found by `alias` — the maker’s explicit override;
     *   2. else a column already on the view, found by its logical `name`;
     *   3. else nothing, and `requestColumns` will have asked for it.
     *
     * **By `alias`, and the values are read by `name`.** Backwards, `find`
     * never matches, the control renders nothing against a real view, and
     * nothing errors — which is how it reached production in pcf-tag-list.
     *
     * A role mapped to the unreadable column is refused here as well as
     * reported: by the time this runs the query has usually already failed,
     * but on a host that tolerated it, using the column would hand every row
     * an empty file name.
     *
     * `columns` is typed as required and `npm start` supplies `undefined`.
     */
    private column(dataset: DataSet, key: ColumnKey): Column | undefined {
        const columns = dataset.columns ?? [];
        const { role, logical } = COLUMNS[key];

        const mapped = columns.find((column) => column.alias === role);

        if (mapped) {
            return mapped.name === UNREADABLE_COLUMN ? undefined : mapped;
        }

        return columns.find((column) => column.name === logical);
    }

    /**
     * Ask the platform for the columns the view does not already carry.
     *
     * This is a mutator in `updateView`, so it is guarded the way
     * `applyPageSize` is — on what *this control* has already asked for,
     * never on whether the column then appeared. A host where `addColumn` is
     * absent or does nothing would otherwise be asked on every render,
     * forever.
     *
     * `addColumn` is typed optional and is feature-detected because of it.
     * Where it is missing the control falls back to whatever the view
     * happens to carry, which on the default Notes view is a list with no
     * size and no MIME type — a worse control, but a working one.
     */
    private requestColumns(dataset: DataSet): boolean {
        const columns = dataset.columns ?? [];
        const add = dataset.addColumn;

        if (typeof add !== 'function') {
            return false;
        }

        let asked = false;

        (Object.keys(COLUMNS) as ColumnKey[]).forEach((key) => {
            const { role, logical } = COLUMNS[key];

            if (this.requested.has(logical)) {
                return;
            }

            // A mapped role is the maker being explicit; do not second-guess
            // it by adding a column they did not choose.
            const mapped = columns.some(
                (column) => column.alias === role && column.name !== UNREADABLE_COLUMN,
            );
            const present = columns.some((column) => column.name === logical);

            if (mapped || present) {
                return;
            }

            this.requested.add(logical);
            add.call(dataset, logical);
            asked = true;
        });

        return asked;
    }

    /** Whether any role was mapped to the column that cannot be read. */
    private mappedTheUnreadableColumn(dataset: DataSet): boolean {
        return (dataset.columns ?? []).some((column) => column.name === UNREADABLE_COLUMN);
    }

    private itemFor(
        dataset: DataSet,
        id: string,
        fileNameColumn: Column,
        getString: (id: string) => string,
    ): Item | null {
        const record = dataset.records[id];

        if (!record) {
            return null;
        }

        const sizeColumn = this.column(dataset, 'fileSize');
        const isDocumentColumn = this.column(dataset, 'isDocument');
        const subjectColumn = this.column(dataset, 'subject');
        const createdOnColumn = this.column(dataset, 'createdOn');
        const mimeTypeColumn = this.column(dataset, 'mimeType');

        const fileName = text(record.getFormattedValue(fileNameColumn.name));
        const subject = subjectColumn ? text(record.getFormattedValue(subjectColumn.name)) : '';

        /*
         * `isdocument` decides it where the role is mapped, read with `getValue`
         * and normalised — `getFormattedValue` on a TwoOptions returns "Yes" or
         * "No", which is a translation trap and would make this control work in
         * English only.
         *
         * With the role unmapped the fallback is a non-empty file name, which is
         * right nearly always and is the reason the role exists at all: nearly
         * always is not a thing to build a download button on.
         */
        const isFile = isDocumentColumn
            ? asBoolean(record.getValue(isDocumentColumn.name), fileName !== '')
            : fileName !== '';

        return {
            id,
            isFile,
            fileName,
            heading:
                subject !== ''
                    ? subject
                    : fileName !== ''
                      ? fileName
                      : getString(isFile ? 'AttachmentList_UntitledFile' : 'AttachmentList_UntitledNote'),
            mimeType: mimeTypeColumn ? text(record.getFormattedValue(mimeTypeColumn.name)) : '',
            bytes: sizeColumn ? numberOf(record.getValue(sizeColumn.name)) : 0,
            created: createdOnColumn ? text(record.getFormattedValue(createdOnColumn.name)) : '',
        };
    }

    private row(
        context: ComponentFramework.Context<IInputs>,
        dataset: DataSet,
        item: Item,
        getString: (id: string) => string,
    ): HTMLElement {
        const li = document.createElement('li');
        li.className = item.isFile ? 'AttachmentList-item' : 'AttachmentList-item AttachmentList-item--note';

        li.appendChild(createIcon(item.isFile ? iconFor(item.mimeType, item.fileName) : 'note'));

        const body = document.createElement('div');
        body.className = 'AttachmentList-body';

        const heading = document.createElement('span');
        heading.className = 'AttachmentList-heading';
        heading.textContent = item.heading;
        body.appendChild(heading);

        /*
         * The meta line is built from the parts that exist. A row with no size
         * role and no date role gets no meta line at all rather than an empty
         * one with a stray separator in it.
         */
        const meta: string[] = [];

        if (item.isFile && item.bytes > 0) {
            meta.push(this.formatSize(context, item.bytes, getString));
        }

        if (item.created !== '') {
            meta.push(item.created);
        }

        if (meta.length > 0) {
            const line = document.createElement('span');
            line.className = 'AttachmentList-meta';
            line.textContent = meta.join(' · ');
            body.appendChild(line);
        }

        li.appendChild(body);

        // A note has nothing to download, and a disabled button on every second
        // row would be noise rather than information.
        if (item.isFile) {
            li.appendChild(this.downloadButton(context, dataset, item, getString));
        }

        return li;
    }

    private downloadButton(
        context: ComponentFramework.Context<IInputs>,
        dataset: DataSet,
        item: Item,
        getString: (id: string) => string,
    ): HTMLElement {
        const button = document.createElement('button');
        button.className = 'AttachmentList-download';
        // Explicitly `button`: the default is `submit`, and a code component
        // can sit inside a real form.
        button.type = 'button';

        /*
         * The name says which file. A list of eight rows otherwise presents
         * eight buttons called "Download" in a screen reader's element list,
         * which is eight ways of describing nothing.
         */
        const label = getString('AttachmentList_Download').replace('{0}', item.heading);
        button.setAttribute('aria-label', label);
        button.title = label;

        button.appendChild(createIcon('download'));
        button.addEventListener('click', () => {
            void this.download(context, dataset, item, getString);
        });

        return button;
    }

    /**
     * The round trip.
     *
     * Order matters twice. The output is set and announced **before** anything
     * is attempted, because on a host that cannot download it is the only thing
     * that happens and a canvas maker binds it. And the size is refused
     * **before** the retrieve, because `retrieveRecord` has no streaming and no
     * abort — a 200 MB attachment arrives as one base64 string in memory, and
     * refusing it once it is there is not a refusal.
     */
    private async download(
        context: ComponentFramework.Context<IInputs>,
        dataset: DataSet,
        item: Item,
        getString: (id: string) => string,
    ): Promise<void> {
        if (this.pending !== '') {
            return;
        }

        this.downloadedRecordId = item.id;
        this.notifyOutputChanged();

        if (!AttachmentList.canDownload(context)) {
            this.announce(getString('AttachmentList_DownloadUnavailable'));
            return;
        }

        const ceiling = Math.max(1, Math.trunc(context.parameters.maxDownloadSizeMb.raw ?? 32));

        if (item.bytes > ceiling * MB) {
            this.announce(getString('AttachmentList_TooLarge').replace('{0}', String(ceiling)));
            return;
        }

        /*
         * `retrieveRecord`'s options string is restricted by its own doc comment
         * to `$select` and `$expand` — no `$filter`, no `$top`. One column, the
         * body; everything else this row needs is already on the dataset and
         * asking again would be a second source of truth for it.
         */
        const column = this.bodyColumn(context);
        const entity = dataset.getTargetEntityType();
        // Some hosts hand GUIDs back brace-wrapped; `retrieveRecord` tolerates
        // both and stripping is one line.
        const id = item.id.replace(/[{}]/g, '');

        this.pending = item.id;
        this.announce(getString('AttachmentList_Downloading').replace('{0}', item.heading));

        try {
            const row = await context.webAPI.retrieveRecord(entity, id, `?$select=${column}`);
            const content = row[column];

            if (this.disposed) {
                return;
            }

            /*
             * Absent and empty are different findings and both end here: a row
             * whose body column was never populated, and a row whose file is
             * zero bytes. Neither is an error and neither is a download.
             */
            if (typeof content !== 'string' || content === '') {
                this.announce(getString('AttachmentList_NoContent').replace('{0}', item.heading));
                return;
            }

            await context.navigation.openFile(
                {
                    fileContent: content,
                    fileName: item.fileName !== '' ? item.fileName : item.heading,
                    /*
                     * KB, not bytes — `FileObject.fileSize` is the one field of
                     * that interface that reads like it means something else,
                     * and `annotation.filesize` next to it is in bytes.
                     * Derived from the body actually being handed over rather
                     * than from the row's number: the row is what the maker
                     * sees, the body is what is true at the moment of the call.
                     */
                    fileSize: bytesToKb(base64Bytes(content)),
                    mimeType: item.mimeType !== '' ? item.mimeType : FALLBACK_MIME,
                },
                /*
                 * 2 is Save. 1 is Open, which for a PDF or an image means the
                 * host may render it inline — so a button that says Download
                 * would do something else on exactly the file types users have
                 * most opinions about. `openMode` is required inside
                 * `OpenFileOptions`, and omitting the options object entirely
                 * defaults to Open.
                 */
                { openMode: 2 },
            );

            /*
             * Nothing is announced on success. The browser's own download
             * chrome is the confirmation, and a live region that says "done"
             * after every press is noise on the ninth one.
             */
        } catch (error) {
            if (!this.disposed) {
                this.announce(getString('AttachmentList_DownloadFailed').replace('{0}', describeError(error)));
            }
        } finally {
            this.pending = '';
        }
    }

    /**
     * Both halves, because each is absent for a different reason and either one
     * alone kills the round trip.
     *
     * `context.webAPI` is absent in canvas and on any host that did not grant
     * the `required="false"` feature. `navigation.openFile` is documented
     * model-driven apps only, and `context.navigation` itself is likely present
     * either way — `openUrl` and `openAlertDialog` are — so the check has to be
     * on the method rather than on the bag.
     *
     * Both are typed as always present, which is a claim about the type
     * definitions rather than about the host.
     */
    /**
     * Whether this host is one where a model-driven-only API means anything.
     *
     * **`typeof x.method === 'function'` is not that test.** Measured with a
     * host probe on a real canvas app, 2026-09-22: **fifteen of fifteen**
     * platform surfaces are published there — `webAPI.retrieveRecord` and
     * `navigation.openFile` among them — and the ones safe to call throw
     * `Method not implemented.` from the call itself.
     *
     * `getClientUrl` refuses by throwing, and a thrown refusal is an answer
     * once it is caught. `uploadHost` already depended on that answer, which is
     * why the Add button was withheld on canvas and this one was not.
     */
    private static modelDrivenHost(context: ComponentFramework.Context<IInputs>): boolean {
        const page = (context as { page?: { getClientUrl?: unknown } }).page;
        const fromPage = typeof page?.getClientUrl === 'function'
            ? ask(() => (page.getClientUrl as () => unknown)())
            : undefined;
        const fromGlobal = ask(() => (globalThis as {
            Xrm?: { Utility?: { getGlobalContext?: () => { getClientUrl?: () => unknown } } };
        }).Xrm?.Utility?.getGlobalContext?.()?.getClientUrl?.());

        return [fromPage, fromGlobal].some((url) => typeof url === 'string' && url !== '');
    }

    /**
     * Whether a file can be fetched and handed to the user.
     *
     * Both methods exist on canvas and refuse, so this said yes there and the
     * Download button was offered on a host that could only report a failure.
     */
    private static canDownload(context: ComponentFramework.Context<IInputs>): boolean {
        return (
            typeof context.webAPI?.retrieveRecord === 'function' &&
            typeof context.navigation?.openFile === 'function' &&
            AttachmentList.modelDrivenHost(context)
        );
    }

    /* ---------------------------------------------------------- upload */

    /**
     * The three host surfaces an upload needs, or `null` if any is missing —
     * and `null` on a read-only form, where the platform's own New button is
     * gone too.
     *
     * Each is detected on its own, because each goes missing on its own:
     * `webAPI` on canvas and on a host that withheld the feature, `contextInfo`
     * on a main grid (there is no record to attach to), `page.getClientUrl`
     * on canvas and the hub's harness. The `Xrm` global is the fallback for
     * the client URL, never the preference — same as `pcf-data-table`.
     *
     * The parent's id is unbraced and lower-cased whatever arrived, because
     * `contextInfo` was measured unbraced (`pcf-data-table` 0.4.0) and a
     * dialog's GUID braced and upper-case, and the bind value takes bare.
     */
    private static uploadHost(context: ComponentFramework.Context<IInputs>): UploadHost | null {
        const loose = context as {
            webAPI?: { createRecord?: unknown };
            mode?: { contextInfo?: unknown; isControlDisabled?: boolean };
            page?: { getClientUrl?: unknown };
        };

        if (loose.mode?.isControlDisabled) {
            return null;
        }

        const create = loose.webAPI?.createRecord;
        const info = loose.mode?.contextInfo as Partial<Parent> | null | undefined;
        /*
         * **A host can publish this method and refuse to run it.** Canvas does:
         * `getClientUrl: Method not implemented.`, thrown from the call itself,
         * so `typeof … === 'function'` passes and the throw escapes. Measured on
         * a real canvas app, 2026-09-21, against `pcf-data-table`.
         *
         * That matters more here than it looks. `uploadHost` is reached from
         * `render()` — through `toolbar()` and `canUpload()` — so the throw
         * escapes the render and the studio replaces the whole list with *Error
         * loading control*. The probe exists to answer "can this host upload?"
         * with a value; a refusal is one of the answers, not an exception.
         */
        const page = loose.page;
        const fromPage = typeof page?.getClientUrl === 'function'
            ? ask(() => (page.getClientUrl as () => unknown)())
            : undefined;
        const fromGlobal = ask(() => (
            globalThis as {
                Xrm?: { Utility?: { getGlobalContext?: () => { getClientUrl?: () => unknown } } };
            }
        ).Xrm?.Utility?.getGlobalContext?.()?.getClientUrl?.());
        const clientUrl = [fromPage, fromGlobal].find(
            (url): url is string => typeof url === 'string' && url !== '',
        );

        if (
            typeof create !== 'function'
            || !info
            || typeof info.entityTypeName !== 'string'
            || !LOGICAL_NAME.test(info.entityTypeName)
            || typeof info.entityId !== 'string'
            || info.entityId === ''
            || !clientUrl
        ) {
            return null;
        }

        return {
            parent: {
                entityTypeName: info.entityTypeName,
                entityId: info.entityId.replace(/[{}]/g, '').toLowerCase(),
            },
            clientUrl: clientUrl.replace(/\/$/, ''),
            create: (create as UploadHost['create']).bind(loose.webAPI),
        };
    }

    /** The host can, and the maker did not say no. */
    private canUpload(context: ComponentFramework.Context<IInputs>): boolean {
        return !asBoolean(context.parameters.hideUpload.raw, false) && AttachmentList.uploadHost(context) !== null;
    }

    /**
     * *Add files* and the input behind it, or nothing at all.
     *
     * A real `<input type="file">` rather than `device.pickFile`, on purpose:
     * every host with a DOM has one, on a phone it opens the same camera roll
     * the device API would — with the full `accept` rule rather than three
     * words — and it costs no install-time prompt. It is hidden with the
     * attribute, not moved off-screen, so the button is the only thing in the
     * tab order; the input itself is never focused.
     */
    private toolbar(
        context: ComponentFramework.Context<IInputs>,
        getString: (id: string) => string,
    ): HTMLElement | null {
        if (!this.canUpload(context)) {
            this.picker = null;
            return null;
        }

        const bar = document.createElement('div');
        bar.className = 'AttachmentList-toolbar';

        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = true;
        input.className = 'AttachmentList-picker';
        input.setAttribute('hidden', '');
        input.tabIndex = -1;

        const accept = (context.parameters.accept.raw ?? '').trim();

        if (accept !== '') {
            input.setAttribute('accept', accept);
        }

        input.addEventListener('change', () => {
            const files = Array.from(input.files ?? []);

            // Cleared so the same file can be picked twice in a row: `change`
            // does not fire when the selection is unchanged.
            input.value = '';
            this.enqueue(files);
        });

        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'AttachmentList-add';
        button.appendChild(createIcon('add'));
        button.appendChild(document.createTextNode(getString('AttachmentList_AddFiles')));
        button.addEventListener('click', () => {
            input.click();
        });

        const hint = document.createElement('span');
        hint.className = 'AttachmentList-dropHint';
        hint.textContent = getString('AttachmentList_DropHint');

        bar.append(button, input, hint);
        this.picker = input;

        return bar;
    }

    /**
     * The four drag events, as arrow properties so the same reference can be
     * removed in `destroy`.
     *
     * **`dragover` and `drop` are prevented whether or not this host can
     * upload.** Left to the browser, a file dropped on the list navigates the
     * frame to the file — and a model-driven form is an iframe the user then
     * loses. The host's inability is reported in words on the drop instead.
     */
    private readonly onDragEnter = (event: DragEvent): void => {
        if (!carriesFiles(event)) {
            return;
        }

        event.preventDefault();
        this.dragDepth += 1;

        if (this.latest && this.canUpload(this.latest)) {
            this.container.classList.add('AttachmentList--dragging');
        }
    };

    private readonly onDragOver = (event: DragEvent): void => {
        if (!carriesFiles(event)) {
            return;
        }

        event.preventDefault();

        if (event.dataTransfer) {
            event.dataTransfer.dropEffect = this.latest && this.canUpload(this.latest) ? 'copy' : 'none';
        }
    };

    private readonly onDragLeave = (): void => {
        if (this.dragDepth === 0) {
            return;
        }

        this.dragDepth -= 1;

        if (this.dragDepth === 0) {
            this.container.classList.remove('AttachmentList--dragging');
        }
    };

    private readonly onDrop = (event: DragEvent): void => {
        this.dragDepth = 0;
        this.container.classList.remove('AttachmentList--dragging');

        if (!carriesFiles(event)) {
            return;
        }

        event.preventDefault();
        this.enqueue(Array.from(event.dataTransfer?.files ?? []));
    };

    /**
     * Files arrive here from either route and join one queue.
     *
     * The maker's veto is silent — a list configured to read only should not
     * lecture about it — and the host's inability is said once, because the
     * user just did something and nothing happened.
     */
    private enqueue(files: File[]): void {
        const context = this.latest;

        if (files.length === 0 || !context || asBoolean(context.parameters.hideUpload.raw, false)) {
            return;
        }

        if (!AttachmentList.uploadHost(context)) {
            this.announce(context.resources.getString('AttachmentList_UploadUnavailable'));
            return;
        }

        this.queue.push(...files);
        void this.drain();
    }

    /**
     * One file at a time, then one refresh.
     *
     * Sequential because a base64 body is a third larger than the file and
     * lives in memory until its create resolves, and because ten parallel
     * creates against one record is how a subgrid gets ten refreshes. A drop
     * while this is running joins the end of the queue and is counted in the
     * progress line. The refresh is asked for once, at the end, and only if
     * something was created — `refresh()` fires `updateView` and is a round
     * trip in its own right.
     *
     * Problems are collected rather than announced as they happen: the live
     * region holds one string, and a failure announced mid-batch would be
     * replaced by the next file's progress before anybody heard it.
     */
    private async drain(): Promise<void> {
        if (this.draining) {
            return;
        }

        this.draining = true;

        const problems: string[] = [];
        let attached = 0;
        let lastName = '';
        let index = 0;

        try {
            while (this.queue.length > 0 && !this.disposed) {
                const file = this.queue.shift() as File;

                index += 1;

                if (await this.attach(file, index, index + this.queue.length, problems)) {
                    attached += 1;
                    lastName = file.name;
                }
            }

            if (this.disposed) {
                return;
            }

            const getString = (id: string): string => this.latest.resources.getString(id);
            const summary =
                attached === 1
                    ? getString('AttachmentList_UploadedOne').replace('{0}', lastName)
                    : attached > 1
                      ? getString('AttachmentList_UploadedMany').replace('{0}', String(attached))
                      : '';

            this.announce([summary, ...problems].filter((line) => line !== '').join(' '));

            if (attached > 0) {
                this.latest.parameters.records.refresh();
            }
        } finally {
            this.draining = false;
        }
    }

    /**
     * The round trip for one file. `true` if a Note now exists for it.
     *
     * The order is the point. Everything that can refuse the file does so
     * **before** it is read: a zero-byte file, a type the maker excluded, a
     * size over the ceiling — each on numbers the browser already has. The
     * metadata reads come next, cached after the first file, so a failure
     * there costs nothing that was encoded. Only then is the file read into a
     * base64 string, and only then sent.
     *
     * Read against the *latest* context each time: a batch of five outlives
     * several `updateView` passes, and a dataset kept from the first is a dead
     * snapshot.
     */
    private async attach(file: File, index: number, total: number, problems: string[]): Promise<boolean> {
        const context = this.latest;
        const getString = (id: string): string => context.resources.getString(id);
        const host = AttachmentList.uploadHost(context);

        this.announce(
            getString('AttachmentList_Uploading')
                .replace('{0}', String(index))
                .replace('{1}', String(total))
                .replace('{2}', file.name),
        );

        if (!host) {
            problems.push(getString('AttachmentList_UploadUnavailable'));
            return false;
        }

        if (file.size === 0) {
            problems.push(getString('AttachmentList_UploadEmpty').replace('{0}', file.name));
            return false;
        }

        if (!accepts(file, context.parameters.accept.raw)) {
            problems.push(getString('AttachmentList_UploadRejectedType').replace('{0}', file.name));
            return false;
        }

        try {
            const ceiling = await this.ceilingFor(context);

            if (this.disposed) {
                return false;
            }

            if (ceiling !== null && file.size > ceiling) {
                problems.push(
                    getString('AttachmentList_UploadTooLarge')
                        .replace('{0}', file.name)
                        .replace('{1}', megabytes(ceiling)),
                );
                return false;
            }

            const dataset = context.parameters.records;
            const entity = dataset.getTargetEntityType();

            if (!LOGICAL_NAME.test(entity)) {
                throw new Error(`Cannot attach to ${entity}.`);
            }

            const nameColumn = this.writeColumn(dataset, 'fileName', entity);

            if (!nameColumn) {
                // A custom attachment table with no file-name role mapped has
                // nowhere to put the name, and a file without one is a text
                // note that happens to have a body.
                throw new Error(getString('AttachmentList_NoFileNameColumn'));
            }

            const bind = await this.bindFor(host, entity, host.parent.entityTypeName);
            const body = await this.read(file);

            if (this.disposed) {
                return false;
            }

            const data: Record<string, unknown> = {
                [nameColumn]: file.name,
                [this.bodyColumn(context)]: body,
                [`${bind.navigationProperty}@odata.bind`]: `/${bind.entitySet}(${host.parent.entityId})`,
            };
            const mimeColumn = this.writeColumn(dataset, 'mimeType', entity);
            const isDocumentColumn = this.writeColumn(dataset, 'isDocument', entity);

            if (mimeColumn) {
                data[mimeColumn] = file.type !== '' ? file.type : FALLBACK_MIME;
            }

            if (isDocumentColumn) {
                data[isDocumentColumn] = true;
            }

            const created = await host.create(entity, data);

            if (this.disposed) {
                return false;
            }

            this.uploadedRecordId = typeof created?.id === 'string' ? created.id.replace(/[{}]/g, '') : '';
            this.notifyOutputChanged();

            return true;
        } catch (error) {
            if (!this.disposed) {
                problems.push(
                    getString('AttachmentList_UploadFailed')
                        .replace('{0}', file.name)
                        .replace('{1}', describeError(error)),
                );
            }

            return false;
        }
    }

    /**
     * Where a value is written: the mapped role, else the column the view
     * carries, else — **on the annotation table only** — the logical name.
     * A custom attachment table whose role is unmapped gets no key, because
     * a column it does not have fails the whole create.
     */
    private writeColumn(dataset: DataSet, key: ColumnKey, entity: string): string | null {
        const column = this.column(dataset, key);

        if (column) {
            return column.name;
        }

        return entity === 'annotation' ? COLUMNS[key].logical : null;
    }

    /**
     * The ceiling in bytes, or `null` to leave the refusal to the server.
     *
     * The maker's number wins when set. Unset, the organisation's own
     * `maxuploadfilesize` is read once through the Web API — it is the number
     * Dataverse will enforce on the create, so refusing against anything else
     * is either too strict or a wasted round trip. A read that fails answers
     * `null` rather than the 5 MB default: an admin who raised the limit
     * should not be told their file is too big by a control that could not
     * find out.
     */
    private ceilingFor(context: ComponentFramework.Context<IInputs>): Promise<number | null> {
        const raw = context.parameters.maxUploadSizeMb.raw;

        if (typeof raw === 'number' && raw > 0) {
            return Promise.resolve(Math.trunc(raw) * MB);
        }

        if (this.ceiling) {
            return this.ceiling;
        }

        const query = (context as { webAPI?: { retrieveMultipleRecords?: unknown } }).webAPI?.retrieveMultipleRecords;

        if (typeof query !== 'function') {
            return Promise.resolve(null);
        }

        this.ceiling = (query as (entity: string, options: string) => Promise<{ entities?: unknown[] }>)
            .call(context.webAPI, 'organization', '?$select=maxuploadfilesize&$top=1')
            .then((result) => {
                const first = result?.entities?.[0] as { maxuploadfilesize?: unknown } | undefined;
                const bytes = first?.maxuploadfilesize;

                return typeof bytes === 'number' && bytes > 0 ? bytes : DEFAULT_UPLOAD_CEILING;
            })
            .catch(() => null);

        return this.ceiling;
    }

    /**
     * The navigation property and entity set a bind needs, read from
     * `EntityDefinitions` — two same-origin fetches, cached per table pair.
     *
     * `context.webAPI` cannot address metadata entities, and
     * `utils.getEntityMetadata` would cost a second install-time prompt for
     * one string. A same-origin fetch needs neither; `pcf-data-table` 0.5.0
     * measured it at 84 ms. The relationship is found by `ReferencedEntity`
     * because `objectid` is polymorphic — one relationship per table that has
     * Notes — and the first match is taken.
     */
    private bindFor(host: UploadHost, entity: string, parent: string): Promise<Bind> {
        const key = `${entity}|${parent}`;
        const cached = this.binds.get(key);

        if (cached) {
            return cached;
        }

        const headers = {
            Accept: 'application/json',
            'OData-MaxVersion': '4.0',
            'OData-Version': '4.0',
        };
        const base = `${host.clientUrl}/api/data/v9.2/EntityDefinitions(LogicalName='`;
        const relationships = fetch(
            `${base}${entity}')/ManyToOneRelationships?$select=ReferencedEntity,ReferencingEntityNavigationPropertyName`,
            { headers, credentials: 'same-origin' },
        ).then((response) => {
            if (!response.ok) {
                throw new Error(`Relationships for ${entity} could not be read (${response.status}).`);
            }

            return response.json();
        });
        const definition = fetch(`${base}${parent}')?$select=EntitySetName`, {
            headers,
            credentials: 'same-origin',
        }).then((response) => {
            if (!response.ok) {
                throw new Error(`${parent} could not be read (${response.status}).`);
            }

            return response.json();
        });

        const bind = Promise.all([relationships, definition]).then(([related, table]) => {
            const rows = Array.isArray((related as { value?: unknown })?.value)
                ? ((related as { value: unknown[] }).value as Array<Record<string, unknown>>)
                : [];
            const match = rows.find(
                (row) => row.ReferencedEntity === parent && typeof row.ReferencingEntityNavigationPropertyName === 'string',
            );
            const entitySet = (table as { EntitySetName?: unknown })?.EntitySetName;

            if (!match) {
                throw new Error(`${entity} has no lookup to ${parent}.`);
            }

            if (typeof entitySet !== 'string' || entitySet === '') {
                throw new Error(`No entity set name for ${parent}.`);
            }

            return { navigationProperty: match.ReferencingEntityNavigationPropertyName as string, entitySet };
        });

        // A failed read is not cached: the next file asks again, which is the
        // right behaviour for a network blip and harmless for a real refusal.
        this.binds.set(key, bind);
        bind.catch(() => {
            this.binds.delete(key);
        });

        return bind;
    }

    /**
     * The file's bytes as bare base64 — the `data:` prefix stripped, because
     * `documentbody` holds base64 and nothing else. The opposite of
     * `pcf-file-drop`, which keeps the whole data URL for a text column.
     *
     * `readAsDataURL` rather than `arrayBuffer` + `btoa`: the reader is
     * abortable, which is what `destroy` needs from a read still in flight.
     */
    private read(file: File): Promise<string> {
        this.reader?.abort();

        return new Promise<string>((resolve, reject) => {
            const reader = new FileReader();

            this.reader = reader;
            reader.onload = () => {
                const result = typeof reader.result === 'string' ? reader.result : '';
                const comma = result.indexOf(',');

                this.reader = null;
                resolve(comma >= 0 ? result.slice(comma + 1) : result);
            };
            reader.onerror = () => {
                this.reader = null;
                reject(reader.error ?? new Error('The file could not be read.'));
            };
            reader.onabort = () => {
                this.reader = null;
                reject(new Error('The read was cancelled.'));
            };
            reader.readAsDataURL(file);
        });
    }

    /**
     * The body column's logical name, validated because it is interpolated into
     * a query string.
     *
     * A merely *wrong* name is let through so the server's own message names
     * it; a name with a quote or a space in it is not, because that is how a
     * typo becomes a different query.
     */
    private bodyColumn(context: ComponentFramework.Context<IInputs>): string {
        const raw = (context.parameters.bodyColumn.raw ?? '').trim();

        return LOGICAL_NAME.test(raw) ? raw : 'documentbody';
    }

    /**
     * A size a person can read.
     *
     * `getFormattedValue` is right for the date, the subject and the file name
     * and **wrong for this**: `filesize` is a `Whole.None` column, so its
     * formatted value is a byte count with a group separator — "1,048,576" —
     * which is correct and unreadable. The number is read with `getValue` and
     * formatted through the platform's own formatter so it matches the rest of
     * the form, with the units in the .resx so a translation can move them.
     */
    private formatSize(
        context: ComponentFramework.Context<IInputs>,
        bytes: number,
        getString: (id: string) => string,
    ): string {
        const inMb = bytes >= MB;
        const value = inMb ? bytes / MB : Math.max(1, Math.round(bytes / KB));
        const decimals = inMb ? 1 : 0;

        const formatted =
            typeof context.formatting?.formatDecimal === 'function'
                ? context.formatting.formatDecimal(value, decimals)
                : value.toFixed(decimals);

        return getString(inMb ? 'AttachmentList_MB' : 'AttachmentList_KB').replace('{0}', formatted);
    }

    /**
     * Blanked before it is set, so a repeat announces. A live region announces a
     * *change* to its contents, and two failures in a row is exactly what this
     * control can produce.
     */
    private announce(text: string): void {
        this.status.textContent = '';
        this.status.textContent = text;
    }

    private message(text: string, isError = false): void {
        const p = document.createElement('p');
        p.className = isError ? 'AttachmentList-message AttachmentList-error' : 'AttachmentList-message';
        p.textContent = text;
        this.container.appendChild(p);
    }

    /**
     * The one legitimate slice: `loadNextPage(true)` returns the whole
     * accumulated range rather than only the new page, so the array holds every
     * page loaded so far.
     */
    private currentPage(ids: string[]): string[] {
        // `0` is "the host reported no page size" — see `applyPageSize`.
        // There is no page to cut to, so draw everything that arrived.
        if (this.appliedPageSize <= 0 || ids.length <= this.appliedPageSize) {
            return ids;
        }

        const start = (this.page - 1) * this.appliedPageSize;
        const slice = ids.slice(start, start + this.appliedPageSize);

        // Never empty the list: showing the wrong page is recoverable by
        // clicking, showing nothing looks like data loss.
        return slice.length > 0 ? slice : ids.slice(-this.appliedPageSize);
    }

    private pager(dataset: DataSet, rowsOnPage: number, getString: (id: string) => string): HTMLElement {
        const wrap = document.createElement('div');
        wrap.className = 'AttachmentList-pager';

        /*
         * `hasPreviousPage` answers a different question than it appears to.
         * Observed on a real model-driven form: after paging forward it stays
         * false, so Previous never unlocks. The control's own counter is what
         * answers "is there a page before this one".
         */
        const previous = document.createElement('button');
        previous.type = 'button';
        previous.className = 'AttachmentList-previous';
        previous.append(chevron(CHEVRON_PREVIOUS), document.createTextNode(getString('AttachmentList_Previous')));
        previous.disabled = this.page <= 1;
        previous.addEventListener('click', () => {
            if (this.page <= 1) {
                return;
            }

            this.restoreFocus = 'previous';
            this.goToPage(dataset, this.page - 1);
        });

        const status = document.createElement('span');
        status.className = 'AttachmentList-pagerStatus';
        status.setAttribute('aria-live', 'polite');
        status.textContent = this.pagerLabel(dataset, rowsOnPage, getString);

        const next = document.createElement('button');
        next.type = 'button';
        next.className = 'AttachmentList-next';
        next.append(document.createTextNode(getString('AttachmentList_Next')), chevron(CHEVRON_NEXT));
        next.disabled = !dataset.paging.hasNextPage;
        next.addEventListener('click', () => {
            if (!dataset.paging.hasNextPage) {
                return;
            }

            this.restoreFocus = 'next';
            this.goToPage(dataset, this.page + 1);
        });

        wrap.append(previous, status, next);

        return wrap;
    }

    /**
     * `loadExactPage` says what a pager means, and it is feature-detected even
     * though it is typed required — a required member is a claim about the type
     * definitions, not about the host.
     */
    private goToPage(dataset: DataSet, target: number): void {
        const back = target < this.page;

        this.page = Math.max(1, target);

        if (typeof dataset.paging.loadExactPage === 'function') {
            dataset.paging.loadExactPage(this.page);
            return;
        }

        if (back) {
            dataset.paging.loadPreviousPage(true);
        } else {
            dataset.paging.loadNextPage(true);
        }
    }

    /**
     * `totalResultCount` is -1 when the platform did not count the rows.
     * Printing "of -1" is the tell that nobody checked, so name the page
     * instead of the range.
     */
    private pagerLabel(dataset: DataSet, rowsOnPage: number, getString: (id: string) => string): string {
        const total = dataset.paging.totalResultCount;

        if (total < 0) {
            return getString('AttachmentList_PageStatus').replace('{0}', String(this.page));
        }

        const start = (this.page - 1) * this.appliedPageSize + 1;

        return getString('AttachmentList_RangeStatus')
            .replace('{0}', String(Math.min(start, total)))
            .replace('{1}', String(Math.min(start + rowsOnPage - 1, total)))
            .replace('{2}', String(total));
    }
}

/** A formatted value the platform may hand back as null. */
function text(value: string | null | undefined): string {
    return typeof value === 'string' ? value : '';
}

function numberOf(raw: unknown): number {
    if (typeof raw === 'number') {
        return Number.isFinite(raw) ? raw : 0;
    }

    if (typeof raw === 'string' && raw.trim() !== '') {
        const parsed = Number(raw);

        return Number.isFinite(parsed) ? parsed : 0;
    }

    return 0;
}

/**
 * A TwoOptions the platform may hand over as a string.
 *
 * `default-value="false"` reaches PCFHub's demo harness as the string "false",
 * and `Boolean("false")` is `true` — so a control reading `raw` directly gets
 * the opposite of its own declared default on the one surface the public sees.
 */
function asBoolean(raw: unknown, fallback: boolean): boolean {
    if (typeof raw === 'boolean') {
        return raw;
    }
    if (raw === 'false' || raw === '0' || raw === 0) {
        return false;
    }
    if (raw === 'true' || raw === '1' || raw === 1) {
        return true;
    }
    return fallback;
}

/**
 * How many bytes a base64 string carries.
 *
 * Four characters encode three bytes, less whatever the padding stands in for.
 * Counted rather than decoded: `atob` on a 30 MB attachment allocates the whole
 * thing again to answer a question about its length.
 */
function base64Bytes(content: string): number {
    const padding = content.endsWith('==') ? 2 : content.endsWith('=') ? 1 : 0;

    return Math.max(0, Math.floor(content.length / 4) * 3 - padding);
}

/**
 * Bytes to KB, which is the unit `FileObject.fileSize` is in.
 *
 * Never zero for a file that has content: a `fileSize` of 0 on a real file
 * reads as an empty attachment to whatever the host shows next.
 */
/**
 * A ceiling in MB, for the refusal line. One decimal when it is not whole:
 * the organisation's limit on the test environment is 8,314,880 bytes, which
 * is 7.9 MB, and "7 MB" was the first thing the walkthrough noticed.
 */
function megabytes(bytes: number): string {
    const mb = bytes / MB;

    return Number.isInteger(mb) ? String(mb) : mb.toFixed(1);
}

function bytesToKb(bytes: number): number {
    return bytes > 0 ? Math.max(1, Math.round(bytes / KB)) : 0;
}

/**
 * What to show the user when a platform call rejects.
 *
 * **`context.webAPI` does not reject with an `Error`.** It rejects with a plain
 * object carrying `errorCode` and `message`, exactly as the Client API's
 * `errorCallback` documents — so the usual
 * `error instanceof Error ? error.message : String(error)` falls through to
 * `String({…})` and renders the string `[object Object]` under the control.
 * That is not cosmetic: it replaces the only account of what went wrong with a
 * message that says nothing, and it is the shape *every* webAPI failure arrives
 * in. Taken from pcf-lookup-search, where it was found on a real form.
 */
function describeError(error: unknown): string {
    if (error instanceof Error && error.message) {
        return error.message;
    }

    if (typeof error === 'object' && error !== null) {
        const message = (error as { message?: unknown }).message;

        if (typeof message === 'string' && message !== '') {
            return message;
        }
    }

    if (typeof error === 'string' && error !== '') {
        return error;
    }

    return 'Unknown error';
}

/**
 * Whether a drag carries files rather than text or a link.
 *
 * `types` is read instead of `files` because during `dragenter`/`dragover`
 * the browser withholds the files themselves — `files` is empty until the
 * drop — and `types` is the only thing that says what is coming.
 */
function carriesFiles(event: DragEvent): boolean {
    const types = event.dataTransfer?.types;

    return types ? Array.from(types).includes('Files') : false;
}

/**
 * The HTML `accept` rule, applied by hand.
 *
 * The file input already narrows the picker with it, but a drop bypasses the
 * picker entirely and a browser's own filter is a suggestion rather than a
 * rule. Three token shapes, like the attribute: `.pdf` against the name,
 * `image/*` against the type's family, `application/pdf` against the whole
 * type. Empty allows everything; a token in none of those shapes matches
 * nothing, which is the safe way to be wrong.
 */
function accepts(file: File, accept: string | null | undefined): boolean {
    const tokens = (accept ?? '')
        .split(',')
        .map((token) => token.trim().toLowerCase())
        .filter((token) => token !== '');

    if (tokens.length === 0) {
        return true;
    }

    const name = file.name.toLowerCase();
    const type = file.type.toLowerCase();

    return tokens.some((token) => {
        if (token.startsWith('.')) {
            return name.endsWith(token);
        }

        if (token.endsWith('/*')) {
            return type.startsWith(token.slice(0, -1));
        }

        return type === token;
    });
}

/**
 * Which of the four glyphs a file gets.
 *
 * The MIME type first, because it is what the row declares; the extension only
 * where there is no type to read, since a maker who did not map the MIME role
 * still deserves a picture rather than a generic page for every row.
 */
function iconFor(mimeType: string, fileName: string): IconName {
    const type = mimeType.toLowerCase();

    if (type.startsWith('image/')) {
        return 'image';
    }

    if (type.includes('spreadsheet') || type.includes('excel') || type === 'text/csv') {
        return 'sheet';
    }

    if (type !== '') {
        return 'document';
    }

    const extension = fileName.toLowerCase().split('.').pop() ?? '';

    if (['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg'].includes(extension)) {
        return 'image';
    }

    if (['xlsx', 'xls', 'csv'].includes(extension)) {
        return 'sheet';
    }

    return 'document';
}

/** The add glyph — Fluent's `Add20Regular` — on the same 20×20 grid as the file icons. */
const ADD_PATH = 'M10 2.5a.5.5 0 0 0-1 0V9H2.5a.5.5 0 0 0 0 1H9v6.5a.5.5 0 0 0 1 0V10h6.5a.5.5 0 0 0 0-1H10z';

/** The download glyph, on the same 20×20 grid as the file icons. */
const DOWNLOAD_PATH =
    'M10 2.5a.5.5 0 0 1 .5.5v9.79l3.15-3.14a.5.5 0 0 1 .7.7l-4 4a.5.5 0 0 1-.7 0l-4-4a.5.5 0 1 1 .7-.7l3.15 3.14V3a.5.5 0 0 1 .5-.5M4 15.5a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5';

/**
 * An icon, inline, so it can follow the theme.
 *
 * Never an `<img src>`, whatever the file format. An image behind `src` renders
 * as an isolated document that cannot see this control's stylesheet, so a
 * `currentColor` inside it resolves to black and a dark form gets a black glyph
 * on a dark background. pcf-file-drop shipped exactly that and it was found on a
 * real form rather than in review.
 */
function createIcon(name: IconName | 'download' | 'add'): SVGSVGElement {
    const svg = document.createElementNS(SVG_NS, 'svg') as SVGSVGElement;

    // `className` on an SVG element is a read-only `SVGAnimatedString`;
    // assigning to it silently does nothing.
    // A modifier per glyph, so the stylesheet can tint a picture differently
    // from a document if it ever wants to — and so an assertion can name which
    // glyph a row got without reading path data.
    const isGlyph = name === 'download' || name === 'add';

    svg.classList.add(isGlyph ? 'AttachmentList-glyph' : 'AttachmentList-icon');

    if (!isGlyph) {
        svg.classList.add('AttachmentList-icon--' + name);
    }
    svg.setAttribute('viewBox', '0 0 20 20');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');

    const path = document.createElementNS(SVG_NS, 'path');

    path.setAttribute('d', name === 'download' ? DOWNLOAD_PATH : name === 'add' ? ADD_PATH : ICON_PATHS[name]);
    path.setAttribute('fill', 'currentColor');
    svg.appendChild(path);

    return svg;
}

/** A chevron, inline, for the same reason. Two strokes, no fill. */
function chevron(d: string): SVGSVGElement {
    const svg = document.createElementNS(SVG_NS, 'svg') as SVGSVGElement;

    svg.classList.add('AttachmentList-chevron');
    svg.setAttribute('viewBox', '0 0 20 20');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');

    const path = document.createElementNS(SVG_NS, 'path');

    path.setAttribute('d', d);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', 'currentColor');
    path.setAttribute('stroke-width', '1.5');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');

    svg.appendChild(path);

    return svg;
}
