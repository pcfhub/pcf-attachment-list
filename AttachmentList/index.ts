import { IInputs, IOutputs } from './generated/ManifestTypes';

type DataSet = ComponentFramework.PropertyTypes.DataSet;
type Column = ComponentFramework.PropertyHelper.DataSetApi.Column;

/** The SVG namespace. `createElement('svg')` makes an *HTML* element of that
 *  name: it parses, it appends, it occupies no space and draws nothing. */
const SVG_NS = 'http://www.w3.org/2000/svg';

/** The platform's ceiling on a page. Not in the type definitions. */
const MAX_PAGE_SIZE = 250;

/** The property-set role names, as written in the manifest. */
const ROLE_FILE_NAME = 'fileNameColumn';
const ROLE_FILE_SIZE = 'fileSizeColumn';
const ROLE_MIME_TYPE = 'mimeTypeColumn';
const ROLE_IS_DOCUMENT = 'isDocumentColumn';
const ROLE_SUBJECT = 'subjectColumn';
const ROLE_CREATED_ON = 'createdOnColumn';

/** What `openFile` is given when the row carries no MIME type: a type that
 *  makes the browser save rather than guess. */
const FALLBACK_MIME = 'application/octet-stream';

/** A Dataverse logical name, which is what may be interpolated into a query. */
const LOGICAL_NAME = /^[a-z][a-z0-9_]*$/;

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
 */
export class AttachmentList implements ComponentFramework.StandardControl<IInputs, IOutputs> {
    private container!: HTMLDivElement;
    private status!: HTMLParagraphElement;

    private notifyOutputChanged!: () => void;

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
    }

    public updateView(context: ComponentFramework.Context<IInputs>): void {

        this.applyTheme(context);
        this.applyPageSize(context, context.parameters.records);
        this.render(context);
    }

    public getOutputs(): IOutputs {
        return { downloadedRecordId: this.downloadedRecordId };
    }

    public destroy(): void {
        this.disposed = true;
        this.pending = '';

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
        const raw = context.parameters.pageSize.raw ?? 25;
        const wanted = Math.min(Math.max(Math.trunc(raw), 1), MAX_PAGE_SIZE);

        if (wanted === this.appliedPageSize) {
            return;
        }

        this.appliedPageSize = wanted;
        dataset.paging.setPageSize(wanted);
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

        if (dataset.error) {
            this.message(dataset.errorMessage || getString('AttachmentList_Error'), true);
            return;
        }

        const fileNameColumn = this.roleColumn(dataset, ROLE_FILE_NAME);

        /*
         * The one required role. In canvas the columns come from the Items
         * Fields flyout, so an unmapped role is a maker mid-configuration
         * rather than an impossible state — and an empty box tells them nothing.
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
     * Find a bound column by its role.
     *
     * **By `alias`, and the values are read by `name`.** `alias` is the
     * property-set name from the manifest; `name` is the schema name of
     * whichever real column the maker mapped to it. Backwards, `find` never
     * matches, the control renders nothing against a real view, and nothing
     * errors — which is how it reached production in pcf-tag-list.
     *
     * `columns` is typed as required and `npm start` supplies `undefined`.
     */
    private roleColumn(dataset: DataSet, alias: string): Column | undefined {
        return (dataset.columns ?? []).find((column) => column.alias === alias);
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

        const sizeColumn = this.roleColumn(dataset, ROLE_FILE_SIZE);
        const isDocumentColumn = this.roleColumn(dataset, ROLE_IS_DOCUMENT);
        const subjectColumn = this.roleColumn(dataset, ROLE_SUBJECT);
        const createdOnColumn = this.roleColumn(dataset, ROLE_CREATED_ON);
        const mimeTypeColumn = this.roleColumn(dataset, ROLE_MIME_TYPE);

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
    private static canDownload(context: ComponentFramework.Context<IInputs>): boolean {
        return (
            typeof context.webAPI?.retrieveRecord === 'function' &&
            typeof context.navigation?.openFile === 'function'
        );
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
        if (ids.length <= this.appliedPageSize) {
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
function createIcon(name: IconName | 'download'): SVGSVGElement {
    const svg = document.createElementNS(SVG_NS, 'svg') as SVGSVGElement;

    // `className` on an SVG element is a read-only `SVGAnimatedString`;
    // assigning to it silently does nothing.
    // A modifier per glyph, so the stylesheet can tint a picture differently
    // from a document if it ever wants to — and so an assertion can name which
    // glyph a row got without reading path data.
    svg.classList.add(name === 'download' ? 'AttachmentList-glyph' : 'AttachmentList-icon');

    if (name !== 'download') {
        svg.classList.add('AttachmentList-icon--' + name);
    }
    svg.setAttribute('viewBox', '0 0 20 20');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');

    const path = document.createElementNS(SVG_NS, 'path');

    path.setAttribute('d', name === 'download' ? DOWNLOAD_PATH : ICON_PATHS[name]);
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
