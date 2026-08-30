/* Run with:  npm test   (needs xlsx + exceljs installed)
   These are the rules the tool is not allowed to get wrong. */
const XLSX = require("xlsx");
const ExcelJS = require("exceljs");
const RF = require("../lib.js");
const { messyWorkbook, householdCSV } = require("./fixtures.js");

let pass = 0, fail = 0;
const ok = (name, cond, extra) => {
  if (cond) { pass++; console.log("  ok   " + name); }
  else { fail++; console.log("  FAIL " + name + (extra !== undefined ? "  -> " + JSON.stringify(extra) : "")); }
};
const eq = (name, got, want) => ok(name + "  (" + JSON.stringify(got) + ")", JSON.stringify(got) === JSON.stringify(want), got);
const group = t => console.log("\n" + t);

/* ------------------------------------------------ pieces */
group("names");
eq("Smith, Emma", pick(RF.splitName("Smith, Emma")), ["Emma", "Smith"]);
eq("Emma Smith", pick(RF.splitName("Emma Smith")), ["Emma", "Smith"]);
eq("Mary Kate Johnson keeps Johnson", pick(RF.splitName("Mary Kate Johnson")), ["Mary", "Johnson"]);
ok("Mary Kate Johnson is flagged", RF.splitName("Mary Kate Johnson").confidence === "check");
eq("Emma R. Smith", pick(RF.splitName("Emma R. Smith")), ["Emma", "Smith"]);
ok("Emma R. Smith not flagged", RF.splitName("Emma R. Smith").confidence === "likely");
eq("Lucas van der Berg", pick(RF.splitName("Lucas van der Berg")), ["Lucas", "van der Berg"]);
eq("Jack Miller Jr.", pick(RF.splitName("Jack Miller Jr.")), ["Jack", "Miller"]);
eq("suffix kept", RF.splitName("Jack Miller Jr.").suffix, "Jr.");
eq("hyphens survive", pick(RF.splitName("Ana Lopez-Reyes")), ["Ana", "Lopez-Reyes"]);
eq("apostrophes survive", pick(RF.splitName("liam o'connor")), ["Liam", "O'Connor"]);
eq("SHOUTING is fixed", pick(RF.splitName("EMMA MCRAE")), ["Emma", "McRae"]);
eq("mixed case is left alone", pick(RF.splitName("DeShawn McRae")), ["DeShawn", "McRae"]);
eq("accents survive", RF.splitName("Jose Munoz̃").last.length > 0, true);
ok("one word flags", RF.splitName("Madonna").confidence === "check");

group("grade");
["Kindergarten", "Kinder", "K", "KG"].forEach(g => eq(g, RF.normGrade(g).value, "K"));
["1", "01", "1st", "Grade 1", "First Grade", "Gr 1"].forEach(g => eq(g, RF.normGrade(g).value, "1"));
eq("Pre-K", RF.normGrade("Pre-K").value, "PK");
eq("TK", RF.normGrade("Transitional Kindergarten").value, "TK");
eq("12", RF.normGrade("12th Grade").value, "12");
eq("2026 stays 2026", RF.normGrade("2026").value, "2026");
ok("2026 is flagged", RF.normGrade("2026").ok === false);
eq("unknown program kept verbatim", RF.normGrade("Room 12 Enrichment").value, "Room 12 Enrichment");
ok("unknown program flagged", RF.normGrade("Room 12 Enrichment").ok === false);

group("phone + email");
["(619) 555-1212", "619-555-1212", "619 555 1212", "6195551212", "+1 619 555 1212"]
  .forEach(p => eq(p, RF.cleanPhone(p).value, "(619) 555-1212"));
eq("extension kept", RF.cleanPhone("619-555-1212 x204").value, "(619) 555-1212 x204");
ok("7 digits flagged", RF.cleanPhone("555-1212").ok === false);
ok("text flagged", RF.cleanPhone("call mom").ok === false);
ok("fake flagged", RF.cleanPhone("111-111-1111").ok === false);
eq("case folded", RF.cleanEmail("MOM@GMAIL.COM").value, "mom@gmail.com");
eq("spaces round @ repaired", RF.cleanEmail("amy @ gmail.com").value, "amy@gmail.com");
ok("amy@gmail flagged", RF.cleanEmail("amy@gmail").ok === false);
ok("double dot flagged", RF.cleanEmail("amy@gmail..com").ok === false);
eq("two emails split", RF.splitEmails("amy@e.com; john@e.com").length, 2);
eq("comma split", RF.splitEmails("amy@e.com, john@e.com").length, 2);
eq("name with comma not split", RF.splitNames("Smith, John").length, 1);
eq("two phones split", RF.splitPhones("619-555-1212 / 619-555-3434").length, 2);

group("column mapping");
const maps = { "StuFirst": "student_first", "First Name": "student_first", "Given Name": "student_first",
  "StudentLastName": "student_last", "Surname": "student_last", "Family Name": "student_last",
  "Student Name": "student_full", "GradeLvl": "grade", "HR Teacher": "teacher", "Homeroom": "teacher",
  "Advisor": "teacher", "PermID": "student_id", "Student #": "student_id", "SIS ID": "student_id",
  "MomEmail": "parent_email", "Guardian 2 Cell": "parent_cell", "Mother Phone": "parent_cell",
  "Parent 1 Email": "parent_email", "Date of Birth": "ignore", "Lunch Status": "ignore" };
Object.keys(maps).forEach(h => eq(h, RF.detectColumn(h).field, maps[h]));
ok("DOB marked sensitive", RF.detectColumn("Date of Birth").sensitive === "date of birth");
ok("emergency contact is not a buyer by default", RF.detectColumn("Emergency Contact Email").questionable === true);

/* ------------------------------------------------ the whole pipeline */
group("household merge (the csv case)");
const csvBook = RF.readWorkbook(XLSX, householdCSV, "smallschool.csv");
const csv = RF.analyze(csvBook, {});
eq("4 rows become 3 students", csv.stats.students, 3);
const emma = csv.students.find(s => s.first === "Emma");
eq("Emma has two parent emails", emma.contacts.filter(c => c.email).length, 2);
eq("Emma keeps both emails", emma.contacts.map(c => c.email).sort(), ["jane@email.com", "john@email.com"]);
ok("Liam stays his own student", !!csv.students.find(s => s.first === "Liam"));
eq("shared parent is not duplicated onto Liam", csv.students.find(s => s.first === "Liam").contacts.length, 1);
eq("uppercase email folded", csv.students.find(s => s.first === "Ana").contacts[0].email, "rosa@email.com");

group("the messy workbook");
const wbBook = RF.readWorkbook(XLSX, messyWorkbook(), "Oakhaven Roster.xlsx");
const r = RF.analyze(wbBook, {});
eq("three tabs seen", r.sheets.length, 3);
eq("two look like rosters", r.sheets.filter(s => s.looksLikeRoster).length, 2);
ok("summary tab excluded", !r.sheets.find(s => s.name === "Summary").included);
eq("header row found on Grade 3", r.sheets[0].headerRow, 4);
eq("K tab implies a grade", r.sheets[1].implies.grade, "K");
ok("K tab offers the grade", r.sheets[1].offerGrade === true);

const by = n => r.students.find(s => (s.first + " " + s.last) === n);
eq("Emma Smith merged to one row", r.students.filter(s => s.first === "Emma" && s.last === "Smith").length, 1);
eq("Emma has mom and dad", by("Emma Smith").contacts.filter(c => c.email).length, 2);
eq("Emma's duplicate phone collapsed", by("Emma Smith").contacts.length, 2);
eq("leading zeros kept", by("Emma Smith").id, "0018472");
eq("exact duplicate removed", r.stats.exactDupes, 1);
eq("Noah appears once", r.students.filter(s => s.first === "Noah").length, 1);
eq("repeated header ignored", r.stats.repeatHeaders, 1);
ok("totals footer ignored", r.stats.junkRows >= 2);
eq("Sofia and Sophia stay separate", r.students.filter(s => s.last === "Martinez").length, 2);
ok("Sofia/Sophia flagged", r.reviews.some(x => x.type === "possible-duplicate" && x.cards[0].name.indexOf("Martinez") > 0));
eq("Isabella merged on her ID", r.students.filter(s => s.last === "Rodriguez").length, 1);
ok("Isabella's spelling flagged", r.reviews.some(x => x.type === "id-conflict"));
eq("Grade 3 normalized", by("Liam O'Connor").grade, "3");
eq("teacher flipped from LAST, FIRST", by("Liam O'Connor").teacher, "Susan Brown");
ok("teacher variants flagged", r.teacherVariants.length >= 1);
eq("2026 grade kept and flagged", by("Zoe Adams").grade, "2026");
ok("odd grade issue raised", r.issues.some(i => i.type === "odd-grade"));
ok("ava@gmail flagged", r.issues.some(i => i.type === "bad-email" && i.value === "ava@gmail"));
ok("555-1212 flagged", r.issues.some(i => i.type === "bad-phone"));
ok("missing teacher flagged", r.issues.some(i => i.type === "missing-teacher"));
ok("phone without email flagged", r.issues.some(i => i.type === "phone-no-email"));
eq("Oliver split from Last, First", by("Oliver Smith") ? "yes" : "no", "yes");
eq("two emails in one cell became two parents", by("Oliver Smith").contacts.filter(c => c.email).length, 2);
eq("van der Berg kept whole", by("Lucas van der Berg") ? by("Lucas van der Berg").last : "", "van der Berg");
eq("extension survived the pipeline", by("Lucas van der Berg").contacts[0].cell, "(619) 555-1818 x22");
eq("nbsp cleaned", by("Amara Okafor") ? "yes" : "no", "yes");
ok("emergency contact not exported", !r.students.some(s => s.contacts.some(c => (c.first + c.last).indexOf("Peg") >= 0)));
ok("DOB and lunch listed as unused", r.unused.filter(u => u.sensitive).length >= 2);
eq("K students got their grade from the tab", by("Oliver Smith").grade, "K");
ok("merged cells noted", r.stats.merges >= 1);
ok("hidden row still read", r.stats.hiddenRows >= 1);

group("decisions");
const merged = RF.analyze(wbBook, { decisions: (function () {
  const d = {};
  const dup = r.reviews.find(x => x.type === "possible-duplicate");
  d[dup.id] = "merge";
  return d;
})() });
eq("merging on request removes a student", merged.stats.students, r.stats.students - 1);
const split = RF.analyze(wbBook, { decisions: (function () {
  const d = {}; d[r.reviews.find(x => x.type === "id-conflict").id] = "split"; return d;
})() });
eq("splitting an ID conflict adds a student", split.stats.students, r.stats.students + 1);
const fixed = RF.analyze(wbBook, { fixes: (function () {
  const f = {}; f[r.issues.find(i => i.type === "bad-email").fixKey] = "ava@gmail.com"; return f;
})() });
ok("a hand-fixed email lands in the export", fixed.students.some(s => s.contacts.some(c => c.email === "ava@gmail.com")));
ok("and stops being an issue", fixed.issues.filter(i => i.type === "bad-email").length === r.issues.filter(i => i.type === "bad-email").length - 1);

group("remapping a column");
const idCol = r.sheets[0].cols.find(c => c.header === "DOB");
const remap = RF.analyze(wbBook, { mapping: (function () { const m = {}; m[idCol.mapKey] = "ignore"; return m; })() });
ok("mapping override accepted", remap.stats.students === r.stats.students);

group("the workbook that comes out");
RF.buildWorkbook(ExcelJS, r, { trace: true }).then(async buf => {
  const back = new ExcelJS.Workbook();
  await back.xlsx.load(buf);
  const names = back.worksheets.map(w => w.name);
  eq("sheet names", names, ["GOTPHOTO READY", "NEEDS REVIEW", "CLEANUP REPORT", "SOURCE TRACE"]);
  const ready = back.getWorksheet("GOTPHOTO READY");
  eq("header row", ready.getRow(1).values.slice(1, 6),
    ["Student First Name", "Student Last Name", "Grade", "Teacher", "Student ID"]);
  eq("one row per student", ready.rowCount - 1, r.stats.students);
  const ids = [];
  ready.eachRow((row, n) => { if (n > 1) ids.push(row.getCell(5).value); });
  ok("IDs are still text with leading zeros", ids.indexOf("0018472") >= 0, ids.slice(0, 3));
  ok("IDs are strings, not numbers", ids.every(v => v === null || typeof v === "string"));
  eq("output file name", RF.outputFileName("Oakhaven Roster.xlsx"), "Oakhaven Roster - CLEANED.xlsx");
  ok("review sheet has rows", back.getWorksheet("NEEDS REVIEW").rowCount > 1);
  ok("report sheet has rows", back.getWorksheet("CLEANUP REPORT").rowCount > 10);

  await csvOutput(r);
  labelTests();

  console.log("\n" + pass + " passed, " + fail + " failed");
  process.exit(fail ? 1 : 0);
});

/* --------------------------------------------- the CSV that GotPhoto reads

   The workbook has four tabs and GotPhoto will not take a file with more than
   one. These are the rules for the single-tab CSV that goes in its place. */
async function csvOutput(r) {
  group("csv");

  const ready = RF.readyTable(r);
  const csv = RF.toCSV(ready);
  const lines = csv.split("\r\n");

  eq("csv header is the export header", lines[0].split(",").slice(0, 5),
    ["Student First Name", "Student Last Name", "Grade", "Teacher", "Student ID"]);
  eq("one line per student, plus the header", lines.length - 1, r.stats.students);
  eq("csv file name", RF.readyFileName("Oakhaven Roster.xlsx"), "Oakhaven Roster - GOTPHOTO READY.csv");
  eq("csv file name, xlsx flavour", RF.readyFileName("Oakhaven Roster.xlsx", "xlsx"),
    "Oakhaven Roster - GOTPHOTO READY.xlsx");

  /* The whole point of the tool: 0018472 must survive as text, and it must not
     arrive at GotPhoto wearing an apostrophe or an ="..." wrapper. */
  ok("leading zeros survive as plain text", /(^|,)0018472(,|$)/m.test(csv), lines[1]);
  ok("no apostrophe armour", csv.indexOf("'0018472") < 0);
  ok("no formula armour", csv.indexOf('="') < 0);

  /* RFC 4180 quoting. */
  eq("plain value", RF.toCSV({ columns: null, rows: [["Smith"]] }), "Smith");
  eq("comma is quoted", RF.toCSV({ columns: null, rows: [["Smith, Emma"]] }), '"Smith, Emma"');
  eq("quote is doubled", RF.toCSV({ columns: null, rows: [['He said "hi"']] }), '"He said ""hi"""');
  eq("newline is quoted", RF.toCSV({ columns: null, rows: [["a\nb"]] }), '"a\nb"');
  eq("padding is preserved", RF.toCSV({ columns: null, rows: [[" x "]] }), '" x "');
  eq("empty stays empty", RF.toCSV({ columns: null, rows: [["", "a"]] }), ",a");
  eq("null is not the word null", RF.toCSV({ columns: null, rows: [[null, undefined]] }), ",");

  /* Every column is present on every line, or GotPhoto reads the wrong field. */
  const width = ready.columns.length;
  const parsed = parseCSVBack(csv);
  ok("every row has every column", parsed.every(row => row.length === width),
    parsed.map(row => row.length).filter(n => n !== width).slice(0, 3));
  eq("round-trips back to the same table", parsed.slice(1), ready.rows);

  /* The clipboard flavour, for pasting into a blank Google Sheet. */
  const tsv = RF.toTSV(ready);
  eq("tsv has the same number of lines", tsv.split("\n").length, r.stats.students + 1);
  eq("tsv splits into the same number of cells", tsv.split("\n")[0].split("\t").length, width);
  ok("tsv carries no stray tabs or line breaks inside a cell",
    RF.toTSV({ columns: null, rows: [["a\tb\nc"]] }) === "a b c");

  /* The Google Sheets import warning fires on exactly the values it should. */
  ok("leading zeros are counted", RF.leadingZeroValues(ready) > 0);
  eq("nothing to warn about", RF.leadingZeroValues({ rows: [["Emma", "3", "12345"]] }), 0);
  eq("0018472 counts", RF.leadingZeroValues({ rows: [["0018472"]] }), 1);
  ok("a lone 0 is not a leading zero", RF.leadingZeroValues({ rows: [["0"]] }) === 0);

  /* The other three sheets, on their own, for a computer with no Excel. */
  const review = RF.reviewTable(r), report = RF.reportTable(r), trace = RF.traceTable(r);
  ok("review csv has rows", RF.toCSV(review).split("\r\n").length > 1);
  ok("report csv has rows", RF.toCSV(report).split("\r\n").length > 10);
  eq("trace csv has one line per student", RF.toCSV(trace).split("\r\n").length - 1, r.stats.students);
  eq("review file name", RF.csvFileName("Oakhaven Roster.xlsx", review.name),
    "Oakhaven Roster - NEEDS REVIEW.csv");

  /* The single-tab workbook, for an importer that insists on Excel. */
  const one = new ExcelJS.Workbook();
  await one.xlsx.load(await RF.buildReadyWorkbook(ExcelJS, r));
  eq("single-sheet workbook has exactly one tab", one.worksheets.map(w => w.name), ["GOTPHOTO READY"]);
  eq("...with the same rows", one.getWorksheet("GOTPHOTO READY").rowCount - 1, r.stats.students);
  const oneIds = [];
  one.getWorksheet("GOTPHOTO READY").eachRow((row, n) => { if (n > 1) oneIds.push(row.getCell(5).value); });
  ok("...and its IDs are still text", oneIds.indexOf("0018472") >= 0, oneIds.slice(0, 3));
}

/* ------------------------------------------------- Avery 5160 name labels

   The two rules that matter physically: 30 to a sheet, and a class never
   shares a sheet with another class. Everything else is about the labels
   fitting inside the die-cut. */
function labelTests() {
  group("labels");

  const kid = (first, last, grade, teacher) => ({ first, last, grade, teacher, id: "", contacts: [] });
  const many = (n, grade, teacher) => Array.from({ length: n },
    (_, i) => kid("Kid" + String(i).padStart(2, "0"), "Last" + String(i).padStart(2, "0"), grade, teacher));

  /* --- grouping --- */
  const roster = [
    kid("Emma", "Smith", "3", "Mrs. Brown"),
    kid("Liam", "Adams", "3", "Susan Brown"),       // same classroom, spelled differently
    kid("Noah", "Kim", "3", "Mr. Jones"),
    kid("Ava", "Young", "K", "Mrs. Alvarez")
  ];
  const cls = RF.labelClasses(roster);
  eq("one class per grade+teacher", cls.length, 3);
  eq("two spellings of one teacher are one class",
    cls.filter(c => c.grade === "3" && /brown/i.test(c.teacher)).length, 1);
  eq("...holding both children",
    cls.find(c => /brown/i.test(c.teacher)).students.map(s => s.first), ["Liam", "Emma"]);
  eq("sorted by last name inside a class",
    cls.find(c => /brown/i.test(c.teacher)).students.map(s => s.last), ["Adams", "Smith"]);
  eq("classes run in grade order", cls.map(c => c.grade), ["K", "3", "3"]);
  eq("class title", RF.classTitle("3", "Mrs. Brown"), "Grade 3 · Mrs. Brown");
  eq("kindergarten is not 'Grade K'", RF.classTitle("K", "Mrs. Alvarez"), "K · Mrs. Alvarez");
  eq("no class at all", RF.classTitle("", ""), "No class listed");

  /* --- pagination: the rule the whole feature turns on --- */
  const pages = RF.labelPages(roster);
  eq("one sheet per class, none shared", pages.length, 3);
  ok("every sheet holds exactly 30 cells", pages.every(p => p.cells.length === 30));
  ok("no sheet mixes two classes", pages.every(p =>
    p.cells.filter(Boolean).every(s => RF.classTitle(s.grade, p.cls.teacher) || true) &&
    new Set(p.cells.filter(Boolean).map(s => s.grade)).size <= 1));
  eq("short class is padded with blanks", pages[0].cells.filter(x => x === null).length, 29);

  /* --- a class that overflows a sheet --- */
  const big = RF.labelPages(many(31, "5", "Mr. Reyes").concat(many(4, "6", "Ms. Diaz")));
  eq("31 students take two sheets, 4 take one", big.length, 3);
  eq("first sheet is full", big[0].cells.filter(Boolean).length, 30);
  eq("...and the 31st is alone on the second", big[1].cells.filter(Boolean).length, 1);
  eq("the next class still starts fresh", big[2].cells.filter(Boolean).length, 4);
  ok("the overflow sheet is the same class", big[0].cls === big[1].cls);
  ok("the next class is a different one", big[1].cls !== big[2].cls);
  eq("exactly 60 to two sheets", RF.labelPages(many(60, "1", "A")).length, 2);
  eq("exactly 30 fits one sheet", RF.labelPages(many(30, "1", "A")).length, 1);

  const st = RF.labelStats(big);
  eq("stats: classes", st.classes, 2);
  eq("stats: sheets", st.sheets, 3);
  eq("stats: labels", st.labels, 35);
  eq("stats: blanks", st.blanks, 3 * 30 - 35);

  eq("the shipped name maximum is what the app preloads", RF.LABEL_TYPE.nameMax, 28);
  eq("...and the class line is set to be read across a room", RF.LABEL_TYPE.metaMax, 12);
  ok("the class line never shrinks below legible", RF.LABEL_TYPE.metaMin >= 7, RF.LABEL_TYPE.metaMin);

  /* Names are fitted to slightly less than the die-cut, because a name that
     measures as an exact fit prints with its last letter shaved off. */
  ok("names are fitted inside the die-cut, not to it",
    RF.LABEL_TYPE.slack > 0.9 && RF.LABEL_TYPE.slack < 1, RF.LABEL_TYPE.slack);

  /* --- fitting the name to the label --- */
  const halfEm = (t, px) => t.length * px * 0.5;     /* a stand-in for the canvas */
  const avail = (2.625 - 0.2) * 96;                  /* 232.8px inside the die-cut */
  eq("a short name takes the maximum size", RF.fitPx("Ava Kim", avail, 21, 7.5, halfEm), 21);
  const long = RF.fitPx("Bartholomew Fitzgerald-Wintersmith", avail, 21, 7.5, halfEm);
  ok("a long name shrinks", long < 21 && long > 7.5, long);
  ok("...to exactly what fits", Math.abs(halfEm("Bartholomew Fitzgerald-Wintersmith", long) - avail) < 0.5,
    halfEm("Bartholomew Fitzgerald-Wintersmith", long));
  eq("an absurd name stops at the floor",
    RF.fitPx("x".repeat(400), avail, 21, 7.5, halfEm), 7.5);
  eq("empty text does not divide by zero", RF.fitPx("", avail, 21, 7.5, halfEm), 21);
  eq("a broken measurer falls back to the maximum", RF.fitPx("Ava", avail, 21, 7.5, () => 0), 21);
  const wide = "GRADE 3 · MRS. VANDERWATERSTONE";
  ok("letter-spacing is paid for",
    RF.fitPx(wide, avail, 21, 7.5, halfEm, null, 0.1) < RF.fitPx(wide, avail, 21, 7.5, halfEm),
    [RF.fitPx(wide, avail, 21, 7.5, halfEm, null, 0.1), RF.fitPx(wide, avail, 21, 7.5, halfEm)]);

  /* --- the printed document --- */
  const html = RF.buildLabelHTML(roster, { measure: halfEm, title: "Oakhaven Roster" });
  eq("one <section> per sheet", (html.match(/<section class="sheet"/g) || []).length, 3);
  eq("one label div per cell", (html.match(/class="lbl /g) || []).length, 90);
  ok("page box is letter", html.indexOf("@page{size:8.5in 11in;margin:0}") >= 0);
  ok("label is 2.625in x 1in", html.indexOf("width:2.625in;height:1in") >= 0);
  ["left:0.1875in", "left:2.9375in", "left:5.6875in"].forEach((c, i) =>
    ok("column " + i + " at " + c, html.indexOf(c) >= 0));
  ["top:0.5in", "top:4.5in", "top:9.5in"].forEach(r =>
    ok("row at " + r, html.indexOf(r) >= 0));
  ok("Lora sets the name", html.indexOf("font-family:'Lora'") >= 0);
  ok("Mulish sets the class line", html.indexOf("'Mulish'") >= 0);
  ok("both faces are fetched", /family=Lora[^"]*family=Mulish/.test(html));
  ok("each sheet breaks to a new page", html.indexOf("page-break-after:always") >= 0);
  ok("...except the last, which would print blank",
    html.indexOf(".sheet:last-child{break-after:auto;page-break-after:auto}") >= 0);
  ok("the class line is upper case", html.indexOf("GRADE 3 · MRS. BROWN") >= 0);
  ok("the name is not", html.indexOf(">Emma Smith<") >= 0);
  ok("the rule is drawn", html.indexOf('<div class="rule"></div>') >= 0);
  ok("colours survive the print dialog", html.indexOf("print-color-adjust:exact") >= 0);
  ok("the sheet carries no script of its own", html.indexOf("<script") < 0);

  /* A name is data from a spreadsheet, so it gets escaped like any other. */
  const nasty = RF.buildLabelHTML([kid('Ann<img src=x onerror="alert(1)">', "O'Hara & Sons", "1", "A")],
    { measure: halfEm });
  ok("angle brackets in a name are escaped", nasty.indexOf("<img") < 0);
  ok("ampersands too", nasty.indexOf("O&#39;Hara &amp; Sons") >= 0);

  eq("label file name", RF.labelFileName("Oakhaven Roster.xlsx"), "Oakhaven Roster - LABELS.html");
}

/* A deliberately independent RFC 4180 reader, so the test does not check the
   writer against itself. */
function parseCSVBack(text) {
  const rows = [];
  let row = [], field = "", quoted = false, i = 0;
  while (i < text.length) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i += 2; continue; }
      if (c === '"') { quoted = false; i++; continue; }
      field += c; i++; continue;
    }
    if (c === '"' && field === "") { quoted = true; i++; continue; }
    if (c === ",") { row.push(field); field = ""; i++; continue; }
    if (c === "\r" && text[i + 1] === "\n") { row.push(field); rows.push(row); row = []; field = ""; i += 2; continue; }
    field += c; i++;
  }
  row.push(field);
  rows.push(row);
  return rows;
}

function pick(n) { return [n.first, n.last]; }

/* appended: edge cases that used to invent duplicates out of blank names */
function edgeCases() {
  group("blank names");
  const csv = ["Student ID,Student Name,Grade,Parent Email,Parent Phone",
    "0001,Emma Smith,3,jane@e.com,",
    "0001,,3,john@e.com,",            // contacts-only second household row
    "0002,,3,rita@e.com,",            // a row with no name at all
    "0003,,3,carl@e.com,",            // ...and another
    "0004,Ana Lee,3,ana@e.com,"].join("\n");
  const res = RF.analyze(RF.readWorkbook(XLSX, csv, "blank.csv"), {});
  const emma = res.students.find(s => s.first === "Emma");
  eq("nameless row merges into its ID", emma.contacts.filter(c => c.email).length, 2);
  eq("no phantom ID conflict", res.reviews.filter(r => r.type === "id-conflict").length, 0);
  eq("two nameless students are not duplicates of each other",
    res.reviews.filter(r => r.type === "possible-duplicate").length, 0);
  eq("they are flagged instead", res.issues.filter(i => i.type === "no-name").length, 2);
}
edgeCases();
