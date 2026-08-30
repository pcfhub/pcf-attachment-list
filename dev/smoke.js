/*
 * Drives the real built bundle outside a browser.
 *
 *     npm run build && npm run smoke
 *
 * What it does: installs the DOM and the platform globals, loads
 * `out/controls/AttachmentList/bundle.js` the way a form would, binds it to the
 * ten-record Notes view in `dev/fixture.js`, presses Download, and asserts what
 * the control did — both what it drew and what it asked the platform for.
 *
 * **The half worth having is the half that leaves the browser.** The list is
 * ordinary; the download is a round trip through two APIs nothing else in this
 * catalogue calls, and every interesting failure lives in it: a body column
 * nobody populated, a body that is an empty string, a rejection that is not an
 * `Error`, a file too large to be worth fetching, and two different hosts that
 * cannot download at all for two different reasons. `dev/host.js` models each
 * of those as a *refusal* rather than as an absence, and this file drives them.
 *
 * **The assertions after the divider are asynchronous**, because the download
 * is. `report()` is called from the end of that block rather than from the top
 * level, so a rejected promise cannot exit the process before the suite says
 * what happened.
 *
 * **What passing here does NOT mean.** Every value below is supplied by this
 * file. It cannot tell you that a real Notes subgrid hands over what this
 * fixture hands over, that `openFile` saves anything, or that the list is
 * legible. Keep those in SPEC.md under *Not verified*, and use
 * `npm run harness` for the half that has to be seen.
 */

const fs = require('fs');
const vm = require('vm');
const path = require('path');

const root = path.join(__dirname, '..');
const dom = require('./dom.js');
const host = require('./host.js');
const clock = require('./clock.js');
const fixture = require('./fixture.js');

const BUNDLE = path.join(root, 'out', 'controls', 'AttachmentList', 'bundle.js');

if (!fs.existsSync(BUNDLE)) {
    console.error('\n  No bundle at out/controls/AttachmentList. Run npm run build first.\n');
    process.exit(1);
}

/* ----------------------------------------------------------- the platform */

dom.install(global);

const time = clock.install(Date.UTC(2026, 2, 14, 12, 0, 0), global);
const registration = host.captureRegistration(global);

/*
 * No platform libraries to supply: a standard control has no
 * `<platform-library>` entry, so there is no React or Fluent global to stand in
 * for and nothing to render deeply. `updateView` writes into the container, and
 * the container is the result.
 */
vm.runInThisContext(fs.readFileSync(BUNDLE, 'utf8'), { filename: 'bundle.js' });

/* ---------------------------------------------------------------- harness */

const results = [];

function check(label, ok, detail) {
    results.push({ ok, label, detail });
}

// `getString` returns a marked key rather than a real string, so an assertion
// can tell "read from the .resx" apart from "hardcoded in the source".
const marked = (key) => `resx:${key}`;

/**
 * The five strings that carry `{0}` placeholders, repeated here as shapes.
 *
 * A marked key has no placeholders in it, so a control doing the substitution
 * and one doing nothing at all produce the same string. These are the token
 * layout the control has to fill, not a copy of the translation.
 */
const TEMPLATES = {
    AttachmentList_KB: '{0} KB',
    AttachmentList_MB: '{0} MB',
    AttachmentList_Download: 'Download {0}',
    AttachmentList_Downloading: 'Downloading {0}',
    AttachmentList_DownloadFailed: 'The download failed. {0}',
    AttachmentList_NoContent: '{0} has no file to download.',
    AttachmentList_TooLarge: 'Larger than the {0} MB limit.',
};

const speaks = (key) => (TEMPLATES[key] !== undefined ? TEMPLATES[key] : marked(key));

/**
 * The manifest's own `default-value`s.
 *
 * `dev/host.js` builds `parameters` from `options.inputs` alone, so a declared
 * property nobody passes arrives as `undefined` — which the platform never
 * does. Seeding every bind with the manifest's defaults is the harness's job;
 * defending against it in the control would be production code bent to suit a
 * rig. Keep these in step with ControlManifest.Input.xml.
 */
const MANIFEST_DEFAULTS = {
    bodyColumn: 'documentbody',
    hideTextNotes: false,
    maxDownloadSizeMb: 32,
};

const live = [];

function disposeAll() {
    while (live.length > 0) {
        live.pop().destroy();
    }
}

function bind(options = {}) {
    const handle = host.createHost(fixture, {
        getString: marked,
        pageSize: 50,
        ...options,
        inputs: { ...MANIFEST_DEFAULTS, ...(options.inputs || {}) },
    });

    const container = dom.createElement('div');
    const instance = new registration.ctor();

    instance.init(
        handle.context,
        () => {
            handle.state.calls.push('notifyOutputChanged');
        },
        {},
        container,
    );

    let driven = host.drive(instance, handle, 10);

    const view = {
        instance,
        container,
        handle,
        calls: () => handle.state.calls,
        outputs: () => instance.getOutputs(),
        find: (selector) => container.querySelector(selector),
        findAll: (selector) => container.querySelectorAll(selector),
        rows: () => container.querySelectorAll('.AttachmentList-item'),
        buttons: () => container.querySelectorAll('.AttachmentList-download'),
        status: () => (container.querySelector('.AttachmentList-status') || { textContent: '' }).textContent,
        headings: () =>
            container.querySelectorAll('.AttachmentList-heading').map((element) => element.textContent),
        get driven() {
            return driven;
        },
        settle: () => {
            driven = host.drive(instance, handle, 10);

            return driven;
        },
        destroy: () => {
            instance.destroy();

            const at = live.indexOf(view);

            if (at !== -1) {
                live.splice(at, 1);
            }
        },
    };

    live.push(view);

    return view;
}

/**
 * Let the download's promise chain run out.
 *
 * `setImmediate` fires after the microtask queue, so one turn of it is past
 * both `await`s in the control. `clock.install` replaces `setTimeout`, not
 * this, so the fake clock is not involved.
 */
const settled = () => new Promise((resolve) => setImmediate(resolve));

/** The argument of the last call whose name starts with `prefix`. */
function lastCall(view, prefix) {
    const calls = view.calls().filter((call) => call.indexOf(prefix) === 0);

    return calls.length > 0 ? calls[calls.length - 1] : '';
}

check('bundle registered a control', typeof registration.ctor === 'function');

if (typeof registration.ctor !== 'function') {
    report();
}

/* ------------------------------------------------------ what it asked for */

const view = bind();

check(
    'settles instead of refreshing forever',
    !view.driven.looping && view.driven.passes === 2,
    `${view.driven.passes} passes`,
);

view.settle();
view.settle();

check(
    'asks for a page size once and then stops asking',
    view.calls().filter((call) => call.startsWith('setPageSize')).length === 1,
    view.calls().join(' '),
);

/* ---------------------------------------------------------------- the list */

check('lists one row per record', view.rows().length === 10, `${view.rows().length} rows`);

check(
    'gives a download button to the files and not to the text notes',
    view.buttons().length === 8,
    `${view.buttons().length} buttons on ${view.rows().length} rows`,
);

check(
    'uses the title where the row has one',
    view.headings()[0] === 'Signed contract',
    view.headings()[0],
);

check(
    'and the file name where it does not',
    view.headings()[2] === 'site-photo.png',
    view.headings()[2],
);

check(
    'calls a file with neither a name nor a title an untitled file',
    view.headings()[4] === 'resx:AttachmentList_UntitledFile',
    view.headings()[4],
);

check(
    'and a note with neither an untitled note',
    view.headings()[8] === 'resx:AttachmentList_UntitledNote',
    view.headings()[8],
);

/*
 * Bound with the real {0} shape rather than a marked key: with the key alone
 * every label is the same string, so the assertion would pass against a control
 * that never substituted anything.
 */
const named = bind({ getString: speaks });

check(
    'names each download button after the row it acts on, not just "Download"',
    new Set(named.buttons().map((button) => button.getAttribute('aria-label'))).size === 8,
    named.buttons()[0].getAttribute('aria-label'),
);

check(
    'picks the glyph from the file type rather than from the extension alone',
    view.rows()[2].querySelector('.AttachmentList-icon--image') !== null &&
        view.rows()[3].querySelector('.AttachmentList-icon--sheet') !== null &&
        view.rows()[1].querySelector('.AttachmentList-icon--note') !== null,
);

check(
    'falls back to the extension when the row declares no type',
    view.rows()[9].querySelector('.AttachmentList-icon--sheet') !== null,
    'handover.csv, with text/csv',
);

const sized = bind({ getString: speaks });

check(
    'shows a size a person can read rather than a byte count',
    sized.findAll('.AttachmentList-meta')[0].textContent.indexOf('240 KB') === 0,
    sized.findAll('.AttachmentList-meta')[0].textContent,
);

check(
    'and switches to MB before the number gets silly',
    sized.findAll('.AttachmentList-meta').some((line) => line.textContent.indexOf('1.5 MB') === 0),
    sized.findAll('.AttachmentList-meta').map((line) => line.textContent).join(' | '),
);

check(
    'gives a text note no size at all, rather than "0 KB"',
    sized.rows()[1].querySelector('.AttachmentList-meta').textContent.indexOf('KB') === -1,
    sized.rows()[1].querySelector('.AttachmentList-meta').textContent,
);

/* ------------------------------------------------------- the maker's switches */

const filesOnly = bind({ inputs: { hideTextNotes: true } });

check('hiding text notes leaves only the files', filesOnly.rows().length === 8, `${filesOnly.rows().length} rows`);

check(
    'reads the string "false" a host may hand over as false, not as truthy',
    bind({ inputs: { hideTextNotes: 'false' } }).rows().length === 10,
);

check(
    'says the record has no attachments, not that it has no notes, when hiding empties the page',
    bind({
        inputs: { hideTextNotes: true },
        records: [fixture.records[1], fixture.records[8]],
    }).find('.AttachmentList-message').textContent === 'resx:AttachmentList_NoFiles',
);

/* ------------------------------------------ the columns the view does not have */

/*
 * The configuration this control is actually dropped onto, and the one that
 * broke it in production. The default Notes associated view carries Title and
 * Created On and nothing else, and a form-side column picker cannot offer the
 * file columns at all — every one of them is IsValidForForm: false, while the
 * one that is true, dummyfilename, is IsValidForRead: false and fails the whole
 * query. So the control has to ask for what it needs rather than be given it.
 */
const bare = bind({ columns: fixture.defaultView.columns });

check(
    'asks the platform for the columns the view does not carry',
    ['filename', 'filesize', 'mimetype', 'isdocument'].every((name) =>
        bare.calls().includes('addColumn("' + name + '")'),
    ),
    bare.calls().filter((call) => call.indexOf('addColumn') === 0).join(' '),
);

check(
    'and lists the files once they arrive, with their sizes',
    bare.rows().length === 10 && bare.buttons().length === 8,
    bare.rows().length + ' rows, ' + bare.buttons().length + ' buttons',
);

bare.settle();
bare.settle();

check(
    'asks for each column once and then stops, even though asking is a mutator',
    bare.calls().filter((call) => call === 'addColumn("filename")').length === 1,
    bare.calls().filter((call) => call.indexOf('addColumn') === 0).length + ' addColumn calls in total',
);

check(
    'does not ask for a column the maker already mapped a role to',
    !bind().calls().some((call) => call.indexOf('addColumn') === 0),
    bind().calls().join(' '),
);

check(
    'does not throw on a host that has no addColumn, and lists what the view has',
    (() => {
        const stuck = bind({ columns: fixture.defaultView.columns, quirks: { hasAddColumn: false } });
        return stuck.find('.AttachmentList-message').textContent === 'resx:AttachmentList_NoFileNameColumn';
    })(),
);

/*
 * The production failure, by name. On a real form the query has already failed
 * by this point and the platform's own message names a column the maker has
 * never heard of — they picked something called "File Name".
 */
const deprecated = bind({ columns: fixture.deprecated.columns });

check(
    'names the deprecated column rather than reporting a generic failure',
    deprecated.find('.AttachmentList-message').textContent === 'resx:AttachmentList_DeprecatedColumn',
    deprecated.find('.AttachmentList-message').textContent,
);

check(
    'and says so even when the platform also reported the query as failed',
    bind({ columns: fixture.deprecated.columns, error: true }).find('.AttachmentList-message')
        .textContent === 'resx:AttachmentList_DeprecatedColumn',
);

check(
    'and never asks for a column it was told not to trust',
    !deprecated.calls().includes('addColumn("dummyfilename")'),
    deprecated.calls().filter((call) => call.indexOf('addColumn') === 0).join(' '),
);
/* --------------------------------------------------------------- the states */

/*
 * 0.1.0 treated an unmapped file-name role as a dead end and said so. It is now
 * the ordinary case -- the form designer cannot offer that column at all -- so
 * the control asks for it instead of complaining. The message survives for the
 * one host where asking is impossible, which the addColumn section covers.
 */
check(
    'an unmapped view is no longer a dead end: it asks, and then it lists',
    bind({ columns: fixture.unmapped.columns }).rows().length === 10,
    bind({ columns: fixture.unmapped.columns }).rows().length + ' rows',
);

check(
    'says the record has no notes when it has none',
    bind({ records: [] }).find('.AttachmentList-message').textContent === 'resx:AttachmentList_Empty',
);

check(
    'says it is loading rather than saying there is nothing',
    bind({ loading: true, records: [] }).find('.AttachmentList-message').textContent ===
        'resx:AttachmentList_Loading',
);

check(
    'reports an error the platform handed down',
    bind({ error: true }).find('.AttachmentList-message').textContent === 'The records could not be loaded.',
);

check(
    'takes no position on the theme when the host publishes none',
    !bind({ host: 'canvas' }).container.classList.contains('AttachmentList--dark'),
);

check(
    'and follows the host into dark when it publishes one',
    bind({ dark: true }).container.classList.contains('AttachmentList--dark'),
);

check(
    'warns up front on a host that cannot download, rather than only after a click',
    bind({ webAPI: false }).find('.AttachmentList-note') !== null &&
        bind().find('.AttachmentList-note') === null,
);

/* ================================================================== *
 *  The download. Asynchronous from here down.
 * ================================================================== */

void (async function downloads() {
    const files = bind({ getString: speaks });

    files.buttons()[0].click();
    await settled();

    check(
        'asks the platform for exactly the one column the list does not already have',
        lastCall(files, 'webAPI.retrieveRecord') === 'webAPI.retrieveRecord("annotation n01 ?$select=documentbody")',
        lastCall(files, 'webAPI.retrieveRecord'),
    );

    check(
        'hands openFile the size in KB, which is not the unit the row is in',
        lastCall(files, 'navigation.openFile').indexOf('"fileSize":6') !== -1,
        lastCall(files, 'navigation.openFile'),
    );

    check(
        'and asks to save it rather than to open it',
        lastCall(files, 'navigation.openFile').indexOf('"openMode":2') !== -1,
        lastCall(files, 'navigation.openFile'),
    );

    check(
        'and the file name and type the row declared',
        lastCall(files, 'navigation.openFile').indexOf('"fileName":"signed-contract.pdf"') !== -1 &&
            lastCall(files, 'navigation.openFile').indexOf('"mimeType":"application/pdf"') !== -1,
        lastCall(files, 'navigation.openFile'),
    );

    check(
        'reports the press before it attempts anything, so a canvas app can act on it',
        files.outputs().downloadedRecordId === 'n01' &&
            files.calls().indexOf('notifyOutputChanged') < files.calls().indexOf('webAPI.retrieveRecord("annotation n01 ?$select=documentbody")'),
        files.calls().join(' | '),
    );

    // n05 — a file with no declared type at all.
    files.buttons()[3].click();
    await settled();

    check(
        'saves an untyped file as a generic one rather than letting the browser guess',
        lastCall(files, 'navigation.openFile').indexOf('"mimeType":"application/octet-stream"') !== -1,
        lastCall(files, 'navigation.openFile'),
    );

    // n04 — the body resolves and is the empty string.
    const empty = bind({ getString: speaks });
    empty.buttons()[2].click();
    await settled();

    check(
        'says a zero-byte file has nothing to download rather than saving an empty one',
        empty.status() === 'Q1 budget has no file to download.' &&
            empty.calls().every((call) => call.indexOf('navigation.openFile') !== 0),
        empty.status(),
    );

    // n07 — the body column came back absent, which is not the same as empty.
    const absent = bind({ getString: speaks });
    absent.buttons()[5].click();
    await settled();

    check(
        'and says the same when the column came back absent rather than empty',
        absent.status() === 'Interchange schema has no file to download.',
        absent.status(),
    );

    // n06 — 40 MB against a 32 MB ceiling.
    const large = bind({ getString: speaks });
    large.buttons()[4].click();
    await settled();

    check(
        'refuses a file over the ceiling without fetching it first',
        large.status() === 'Larger than the 32 MB limit.' &&
            large.calls().every((call) => call.indexOf('webAPI.retrieveRecord') !== 0),
        large.status(),
    );

    // n08 — the retrieve rejects, with a plain object.
    const failing = bind({ getString: speaks });
    failing.buttons()[6].click();
    await settled();

    check(
        'renders the platform’s own message when a retrieve rejects, not "[object Object]"',
        failing.status() === 'The download failed. The record could not be retrieved.',
        failing.status(),
    );

    const busy = bind({ getString: speaks });
    busy.buttons()[0].click();
    busy.buttons()[1].click();
    await settled();

    check(
        'ignores a second press while one download is still in flight',
        busy.calls().filter((call) => call.indexOf('webAPI.retrieveRecord') === 0).length === 1,
        busy.calls().filter((call) => call.indexOf('webAPI.retrieveRecord') === 0).join(' | '),
    );

    const noApi = bind({ getString: speaks, webAPI: false });
    noApi.buttons()[0].click();
    await settled();

    check(
        'on a host with no Web API, still reports the press and says why nothing arrived',
        noApi.outputs().downloadedRecordId === 'n01' &&
            noApi.status() === 'resx:AttachmentList_DownloadUnavailable',
        noApi.status(),
    );

    const noOpen = bind({ getString: speaks, openFile: false });
    noOpen.buttons()[0].click();
    await settled();

    check(
        'and the same on a host that has the Web API but cannot open a file',
        noOpen.outputs().downloadedRecordId === 'n01' &&
            noOpen.status() === 'resx:AttachmentList_DownloadUnavailable' &&
            noOpen.calls().every((call) => call.indexOf('webAPI.retrieveRecord') !== 0),
        noOpen.status(),
    );

    const misspelled = bind({ getString: speaks, inputs: { bodyColumn: 'not a column name!' } });
    misspelled.buttons()[0].click();
    await settled();

    check(
        'refuses to put a maker’s typo into a query string',
        lastCall(misspelled, 'webAPI.retrieveRecord').indexOf('?$select=documentbody') !== -1,
        lastCall(misspelled, 'webAPI.retrieveRecord'),
    );

    /* ---------------------------------------------------- what destroy owes */

    disposeAll();

    const timersBefore = time.pending();
    const listeners = () =>
        Object.values(dom.document.listeners).reduce((total, list) => total + list.length, 0);
    const listenersBefore = listeners();

    const torn = bind();
    torn.buttons()[0].click();
    torn.destroy();
    await settled();

    check(
        'a download in flight when the control is destroyed announces nothing at all',
        torn.status() === '',
        torn.status(),
    );

    check(
        'destroy() releases every timer the control took',
        time.pending() === timersBefore,
        `${timersBefore} → ${time.pending()}`,
    );

    check(
        'and every document-level listener',
        listeners() === listenersBefore,
        `${listenersBefore} → ${listeners()}`,
    );

    const rerendered = bind();
    const afterFirst = time.pending();

    rerendered.settle();
    rerendered.settle();
    rerendered.settle();

    check('and re-rendering does not add one', time.pending() === afterFirst, `${afterFirst} → ${time.pending()}`);

    disposeAll();

    report();
})();

function report() {
    const failed = results.filter((result) => !result.ok);

    for (const result of results) {
        const detail = result.detail ? `  — ${result.detail}` : '';

        console.log(`  ${result.ok ? 'ok  ' : 'FAIL'}  ${result.label}${detail}`);
    }

    console.log(
        failed.length > 0
            ? `\n  ${failed.length} of ${results.length} failed\n`
            : `\n  ${results.length} passed — the control's own decisions only; see SPEC.md for what a real form still has to confirm\n`,
    );

    process.exit(failed.length > 0 ? 1 : 0);
}
