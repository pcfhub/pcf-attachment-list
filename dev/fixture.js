/*
 * The view the dev harness binds: columns and records, chosen for the edges.
 *
 * **This is not `demo/records.json`.** That one is the hub's demo fixture and
 * exists to look like a working control on a public page. This one exists to
 * break things:
 *
 *   - **`alias` differs from `name` on every column.** A property-set role is
 *     found on the column by `alias` and read off the record by `name`, and a
 *     fixture that sets the two to the same string resolves in both directions
 *     — so the control looks right here and renders nothing against a real
 *     view. That is how the bug reached production in pcf-tag-list.
 *   - **a plain text note**, which is what an `annotation` with
 *     `isdocument = false` is: no file name, no body, no size, and no download
 *     button. Half of a real Notes subgrid looks like this.
 *   - **the four bodies**, which are four different outcomes and not one:
 *     a string is a file, `''` is a zero-byte file, `undefined` is a column
 *     nobody populated, and `null` makes `retrieveRecord` reject. See
 *     `dev/host.js`.
 *   - **a file over the ceiling**, so the refusal that happens *before* the
 *     fetch can be asserted.
 *   - **a file with no name, a note with no subject**, and an unrecognised MIME
 *     type, because a heading and a glyph both have to come from somewhere.
 *
 * Loaded by `harness.html` in a browser and by `smoke.js` in Node, so it
 * assigns both ways and depends on neither.
 */

(function (root, factory) {
    'use strict';

    var fixture = factory();

    if (typeof module === 'object' && module.exports) {
        module.exports = fixture;
    }

    if (root) {
        root.__pcfFixture = fixture;
    }
})(typeof window !== 'undefined' ? window : null, function () {
    'use strict';

    /*
     * 8192 base64 characters with no padding — 6144 bytes, and therefore 6 KB
     * once `FileObject.fileSize` has been worked out. A round number so the
     * bytes-to-KB conversion can be asserted rather than eyeballed.
     */
    var BODY = new Array(8193).join('A');

    var COLUMNS = [
        {
            name: 'filename',
            displayName: 'File name',
            dataType: 'SingleLine.Text',
            alias: 'fileNameColumn',
            order: 0,
            visualSizeFactor: 200,
            isPrimary: true,
        },
        {
            name: 'filesize',
            displayName: 'File size',
            dataType: 'Whole.None',
            alias: 'fileSizeColumn',
            order: 1,
            visualSizeFactor: 90,
        },
        {
            name: 'mimetype',
            displayName: 'File type',
            dataType: 'SingleLine.Text',
            alias: 'mimeTypeColumn',
            order: 2,
            visualSizeFactor: 120,
        },
        {
            name: 'isdocument',
            displayName: 'Is a file',
            dataType: 'TwoOptions',
            alias: 'isDocumentColumn',
            order: 3,
            visualSizeFactor: 60,
        },
        {
            name: 'subject',
            displayName: 'Title',
            dataType: 'SingleLine.Text',
            alias: 'subjectColumn',
            order: 4,
            visualSizeFactor: 180,
        },
        {
            name: 'createdon',
            displayName: 'Created on',
            dataType: 'DateAndTime.DateAndTime',
            alias: 'createdOnColumn',
            order: 5,
            visualSizeFactor: 140,
        },
    ];

    function row(id, values, formatted, body) {
        var record = { id: id, values: values };

        if (formatted) {
            record.formatted = formatted;
        }

        // Deliberately only set when supplied: `undefined` is one of the four
        // outcomes and has to stay distinguishable from `null` and from ''.
        if (arguments.length > 3) {
            record.body = body;
        }

        return record;
    }

    return {
        targetEntityType: 'annotation',
        title: 'Notes',
        columns: COLUMNS,

        records: [
            row(
                'n01',
                {
                    filename: 'signed-contract.pdf',
                    filesize: 245760,
                    mimetype: 'application/pdf',
                    isdocument: true,
                    subject: 'Signed contract',
                    createdon: '2026-03-02T09:14:00Z',
                },
                { createdon: '2 Mar 2026 09:14' },
                BODY,
            ),

            // A plain text note. No file name, no body, no size, no download.
            row(
                'n02',
                {
                    filename: '',
                    filesize: 0,
                    mimetype: '',
                    isdocument: false,
                    subject: 'Called the customer about the renewal',
                    createdon: '2026-03-04T11:02:00Z',
                },
                { createdon: '4 Mar 2026 11:02' },
            ),

            row(
                'n03',
                {
                    filename: 'site-photo.png',
                    filesize: 1572864,
                    mimetype: 'image/png',
                    isdocument: true,
                    subject: '',
                    createdon: '2026-03-06T14:40:00Z',
                },
                { createdon: '6 Mar 2026 14:40' },
                BODY,
            ),

            // A zero-byte file: the body resolves, and it is empty.
            row(
                'n04',
                {
                    filename: 'budget.xlsx',
                    filesize: 0,
                    mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    isdocument: true,
                    subject: 'Q1 budget',
                    createdon: '2026-03-07T08:00:00Z',
                },
                { createdon: '7 Mar 2026 08:00' },
                '',
            ),

            // A file with no name at all, which still has to be downloadable
            // and still has to be called something in the list.
            row(
                'n05',
                {
                    filename: '',
                    filesize: 4096,
                    // No type either, so the octet-stream fallback has a row.
                    mimetype: '',
                    isdocument: true,
                    subject: '',
                    createdon: '2026-03-08T16:20:00Z',
                },
                { createdon: '8 Mar 2026 16:20' },
                BODY,
            ),

            // 40 MB — over the default 32 MB ceiling, so it is refused before
            // anything is fetched.
            row(
                'n06',
                {
                    filename: 'site-survey-raw.zip',
                    filesize: 41943040,
                    mimetype: 'application/zip',
                    isdocument: true,
                    subject: 'Raw survey data',
                    createdon: '2026-03-09T10:00:00Z',
                },
                { createdon: '9 Mar 2026 10:00' },
                BODY,
            ),

            // The body column exists on the row and nobody populated it: the
            // response comes back without the property at all.
            row(
                'n07',
                {
                    filename: 'schema.custom',
                    filesize: 2048,
                    mimetype: 'application/vnd.contoso.schema+xml',
                    isdocument: true,
                    subject: 'Interchange schema',
                    createdon: '2026-03-10T12:30:00Z',
                },
                { createdon: '10 Mar 2026 12:30' },
                undefined,
            ),

            // The retrieve rejects — and with a plain object, not an Error.
            row(
                'n08',
                {
                    filename: 'a-name-long-enough-to-need-somewhere-to-go-when-the-form-section-is-narrow.docx',
                    filesize: 65536,
                    mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                    isdocument: true,
                    subject: '',
                    createdon: '2026-03-11T15:45:00Z',
                },
                { createdon: '11 Mar 2026 15:45' },
                null,
            ),

            // Neither a subject nor a file name, and not a file.
            row(
                'n09',
                {
                    filename: '',
                    filesize: 0,
                    mimetype: '',
                    isdocument: false,
                    subject: '',
                    createdon: '2026-03-12T07:05:00Z',
                },
                { createdon: '12 Mar 2026 07:05' },
            ),

            row(
                'n10',
                {
                    filename: 'handover.csv',
                    filesize: 12288,
                    mimetype: 'text/csv',
                    isdocument: true,
                    subject: 'Handover list',
                    createdon: '2026-03-13T17:10:00Z',
                },
                { createdon: '13 Mar 2026 17:10' },
                BODY,
            ),
        ],

        /**
         * The columns the annotation table HAS but the default Notes
         * associated view does NOT select. `dev/host.js` materialises one of
         * these when the control asks for it with `addColumn`, and ignores a
         * request for anything not in here — which is what a real table does
         * with a name that is not one of its own.
         */
        catalogue: {
            filename: COLUMNS[0],
            filesize: COLUMNS[1],
            mimetype: COLUMNS[2],
            isdocument: COLUMNS[3],
        },

        /**
         * The out-of-the-box Notes associated view, which is what this control
         * is actually dropped onto: Title, Description, Created On, Modified By
         * and nothing else. No file name, no size, no MIME type, no is-a-file —
         * and no roles mapped, because a form-side column picker cannot offer
         * any of those columns. Everything the control needs it has to ask for.
         */
        defaultView: {
            columns: [COLUMNS[4], COLUMNS[5]],
        },

        /**
         * A maker who mapped the File name role in the form designer, which on
         * the annotation table can only offer the deprecated column.
         *
         * On a real form this configuration fails the whole subgrid query with
         * 0x80041a08 before the control renders at all; here the column simply
         * arrives, so the control has to notice it by name.
         */
        deprecated: {
            columns: [
                {
                    name: 'dummyfilename',
                    displayName: 'File Name(deprecated)',
                    dataType: 'SingleLine.Text',
                    alias: 'fileNameColumn',
                    order: 0,
                    visualSizeFactor: 200,
                },
                COLUMNS[4],
                COLUMNS[5],
            ],
        },
        /** Nothing at all on the record. */
        empty: {
            records: [],
        },

        /**
         * A view where the required role was never mapped — in canvas that is a
         * maker who has not finished the Fields flyout, not a broken control.
         */
        unmapped: {
            columns: [COLUMNS[4], COLUMNS[5]],
        },
    };
});
