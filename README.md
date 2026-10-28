# Roster Fixer

*by ClassPhoto.net — same family as ClassPhoto and ServiceStix.*

Drop in whatever spreadsheet the school sent. Get back one clean row per
student, ready to import into GotPhoto.

Everything runs in the browser. The roster never leaves your computer, and the
file you upload is never modified.

**The one rule:** formatting problems get fixed automatically, identity problems
get handed back to you. The tool will never quietly turn two children into one
row, and it will never throw away a parent's contact details.

---

## Deploy it (about 60 seconds)

1. Go to https://app.netlify.com/drop
2. Drag **this folder** onto the page
3. Netlify gives you a URL. Bookmark it.

To update later, drag the folder onto the same site's "Deploys" page.

It is four static files with no build step, so any static host works — and
double-clicking `index.html` works too, as long as you are online (SheetJS and
ExcelJS load from a CDN).

`_headers` ships a Content-Security-Policy with `connect-src 'none'`, so on
Netlify the app is *incapable* of sending anything anywhere — no fetch, no XHR,
no beacon. A roster full of children's names and their parents' phone numbers
physically cannot leave the browser, and anyone can check that from the
response headers.

---

## Using it

**Upload → check the columns → fix → review a handful → download.**

### 1. Upload

`.xlsx`, `.xls` or `.csv`. Title rows, logos, blank rows, repeated headers,
footer totals, merged cells, hidden rows, formulas and multiple tabs are all
expected.

### 2. Check the columns

The app shows every tab it found, which one looks like a roster, which row it
believes is the header, and what it thinks each column means:

| School column | Exported as |
| --- | --- |
| StuFirst | Student First Name |
| GradeLvl | Group (the grade) |
| HR Teacher | Teacher |
| PermID | Student ID |
| MomEmail | Parent Email 1 |
| DadCell | Parent Cell 2 |

Change anything that is wrong before it processes — school information systems
name things wildly differently, and this is the screen that absorbs that.

A tab named `Grade 3` with no grade column will offer to fill Grade = 3. A tab
named `Sheet1` will not offer anything.

### 3. Fix & review

A dashboard of what was fixed automatically, what needs you, and which columns
are being left out. Then the questions — each one a card with the two records
side by side and buttons like **Merge as same student** / **Keep as two
students**.

### 4. Download

GotPhoto will not take a workbook with more than one tab in it, so the roster
goes out on its own.

**Send this to GotPhoto**

| | |
| --- | --- |
| `[Name] - GOTPHOTO READY.csv` | the roster, one tab, one row per student. Upload it straight to GotPhoto |
| `[Name] - GOTPHOTO READY.xlsx` | the same single tab as Excel, if the importer asks for a workbook |
| **Copy for Google Sheets** | puts the whole roster on the clipboard; paste it into cell A1 of a blank sheet |

**Keep for yourself** — GotPhoto never sees these.

| | |
| --- | --- |
| `[Name] - NEEDS REVIEW.csv` | every issue, with the source sheet and row it came from |
| `[Name] - CLEANUP REPORT.csv` | counts of everything that changed, plus the columns left out |
| `[Name] - SOURCE TRACE.csv` | every student, the rows behind them, and what changed |
| `[Name] - CLEANED.xlsx` | all of the above as one workbook, source trace optional |

Every sheet is built once as a table and then written out as both a tab and a
CSV, so the CSV of a sheet and the Excel tab of that sheet cannot disagree.

---

## Name labels

The download screen also prints a sheet of **Avery 5160** name labels for every
student — 30 to a page, three across and ten down.

| | |
| --- | --- |
| Name | the child's full name in **Lora**, set as large as it will fit on one line |
| Under it | a hairline rule with a small diamond |
| Below that | `GRADE 3 · MRS. BROWN` in **Mulish** small caps |

**Every class starts on a new sheet.** A class of 31 takes two sheets and the
rest of the second one stays blank; the next class never begins halfway down a
page you have already peeled. That is the point — you pull one classroom off
the printer at a time — so part-full sheets are expected, and the app tells you
how many sheets and how many blanks before you print.

A classroom is one grade and one teacher, matched on the same key the engine
uses to spot two spellings of one name, so a roster carrying both `Mrs. Brown`
and `BROWN, SUSAN` gives you one stack rather than two half-empty ones. Names
are sorted by last name inside each class.

The button opens a print preview in a new tab. **Set Margins to None and Scale
to 100%**, and turn off headers and footers — anything else moves the grid off
the die-cut. The preview shows the label outlines on screen so you can check
the alignment before committing a sheet; they do not print.

If your browser blocks the new tab, the same sheet is saved as an `.html` file
instead — open it and press print.

---

## No Excel on the computer

Nothing here needs it. The CSV is the main output, and it goes straight into
GotPhoto without being opened at all. If you do want to look at it first:

1. Open a blank sheet at [sheets.new](https://sheets.new).
2. **File → Import → Upload**, and pick the CSV.
3. Set **Convert text to numbers, dates and formulas** to **No**.
4. **Import data**.

Step 3 is the one that matters. Left on, Google Sheets turns a Student ID of
`0018472` into `18472` — the exact thing this tool exists to prevent. The app
counts the values at risk in your roster and says so on the download screen
when there are any.

The file itself is always correct: the CSV holds `0018472` as plain text, with
no apostrophe and no `="..."` wrapper, because GotPhoto reads the file directly
and either of those would arrive as part of the data. CSVs are written as
UTF-8 with no byte-order mark, which is what Google Sheets and GotPhoto expect
— desktop Excel is the only reader that wants the mark, and it is the one
reader this path is designed to do without.

---

## When two rows are the same child

This is the whole point of the tool. Schools export one row per **parent**, so a
child in two households arrives twice:

| Student | Parent | Email |
| --- | --- | --- |
| Emma Smith | Jane Smith | jane@email.com |
| Emma Smith | John Smith | john@email.com |

That is one student with two buyers, not two students.

**Merged automatically:**

- identical rows (reported, not silently dropped)
- rows sharing a valid **Student ID** — the primary identity key
- rows with no ID that match on **first + last + grade + teacher**, where every
  one of those the file actually provides is filled in

**Never merged automatically — you decide:**

- same name and grade, **different teacher**
- same name and grade, teacher blank on one of them when the file has teachers
- similar-but-not-identical names (`Sofia` / `Sophia`, nicknames, typos)
- the same name in two different grades
- the same name with two different Student IDs

Same last name is never treated as evidence — siblings stay separate.

One Student ID carrying two spellings (`Isabella` / `Isabela`) stays a single
student, because the ID says so, but the name discrepancy is flagged and you
choose which spelling to keep — or split them back apart.

Parent contacts are matched on the normalised email and phone, so
`(619) 555-1234` and `619-555-1234` are one number, and `MOM@GMAIL.COM` and
`mom@gmail.com` are one person.

---

## What it fixes without asking

| | |
| --- | --- |
| Header row | finds the real one under the school name, report title and blank rows |
| Junk rows | blank rows, `Total Students: 427`, page numbers, repeated headers, footers |
| Names | `Smith, Emma` → Emma / Smith; SHOUTING → Shouting; keeps `DeShawn`, `McRae`, `van der Berg`, `O'Connor`, hyphens, accents, `Jr.` |
| Notes in names | `Sawyer Hale (Male)` → Sawyer / Hale, with the note logged; `Elizabeth (Tessa) Quill` → **Tessa** / Quill, because the nickname is what goes on the photo, and Elizabeth is kept in the Source Trace |
| Grade | `Kindergarten` `Kinder` `KG` → `K`; `01` `1st` `Grade 1` `First Grade` → `1`; PS, PK, JK, TK, K, 1–12 |
| Grade + teacher in one column | `First Grade - Mrs. Pellham's Class` → Group `First Grade` (word for word, however the school wrote it) and Teacher `Mrs. Pellham`. Picked automatically when most of a column reads that way |
| Teacher | spacing and case, `Mrs` → `Mrs.`, `SMITH, JENNIFER` → `Jennifer Smith`, `'s Class` taken off the end, separate first/last teacher columns joined into one. `JK` stays `JK` |
| Parent names in one column | `Jane Doe & Chris Brown`, `John and Mary Smith` → one name per parent, each put with the email that matches it (`janedoe@…` is Jane). When the emails do not say, the names go in column order and the row is flagged |
| Student ID | always text — `0018472` stays `0018472`, never `18472` and never `1.8472E+04` |
| Email | trims, folds case, repairs `amy @ gmail.com`, drops `none`/`N/A` |
| Phone | `+1 (619) 555-1212 x204` → `(619) 555-1212 x204`, extensions kept |
| Two in one cell | `amy@e.com; john@e.com` becomes Parent 1 and Parent 2 |
| Spreadsheet mess | merged cells filled down, formulas flattened, non-breaking spaces, smart quotes, line breaks, zero-width characters |

Unknown grades (`2026`, `Room 12 Enrichment`) are kept exactly as written and
flagged. Nothing is ever guessed into a real grade number.

## What it asks about

Possible duplicate students · one ID with two names · ambiguous name splits
(`Mary Kate Johnson`) · invalid emails and phones · missing names, grades,
teachers and IDs (when the rest of the roster has them) · rows with no parent
contact at all.

A look-alike name on its own is never enough to ask. `Eli` and `Elizabeth`
in different classes with no parent in common are two children, so that pair
is not asked about; the cleanup report counts how many were set aside.
Identical names are always asked about.

**Parent phone with no email** gets its own warning: GotPhoto's names-list
import needs an email address for a buyer contact, so a phone-only parent will
not import. No dummy addresses are ever invented.

Invalid emails and phones are held out of the export until they are right —
they are on the Needs Review sheet and editable right in the review screen, so
nothing is lost.

## The sanity pass

After it cleans the roster and before the download, it looks for signs that
the *mapping* went wrong rather than the data: a required field blank for most
of the roster (Group blank for 166 of 166 is a mapping problem, not 166 missing
grades), one label class for a school of 40 or more, a bracket or a gender word
in an exported name, a column of people's names marked Not exported, or a short
capital word like `JK` that tidying changed. Each one is a red box at the top of
step 3 and again on the download step, and it is listed in the cleanup report.

## What it leaves out

Date of birth, home address, medical, lunch status, IEP/504, gender,
race/ethnicity, discipline, logins and internal notes are listed under "not
exported" rather than shipped to GotPhoto. Photo/media release columns are
called out separately in case you want one. Any of them can be switched on from
the mapping screen.

Emergency contacts are **not** treated as buyers unless you say they are.

---

## The files

| | |
| --- | --- |
| `index.html` | the page and all of its styling, in the ClassPhoto house style |
| `lib.js` | the cleanup engine and the label sheet — no DOM, no globals, testable on its own |
| `app.js` | reads the file, draws the screen, feeds your choices back to the engine |
| `test/` | the rules that are not allowed to break |

The engine is one pure function from (parsed workbook + your choices) to
everything on screen and in the download. Every checkbox, mapping change and
merge decision re-runs it from scratch, so nothing has to be undone and the
download always matches what you are looking at.

## Tests

```
npm install     # xlsx + exceljs, only needed for the tests
npm test
```

`test/campus.test.js` needs nothing installed (`node test/campus.test.js`). It
runs the 1.2 parsing fixes against `test/campus-fixture.js`, a made-up roster
in the shape of a real one. Real rosters never go in this repository.

The suite builds deliberately awful workbooks — title rows, camel-case headers,
split households, an exact duplicate, a repeated header row, a totals footer,
leading-zero IDs, two emails in one cell, non-breaking spaces, an emergency
contact, a `2026` grade — and asserts what comes out the other end, including
the finished .xlsx.
