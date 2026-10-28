/* Run with:  node test/campus.test.js   (needs nothing installed)
   The 1.1 parsing fixes, against a made-up roster shaped like the real one
   that went wrong. Each group is one thing that used to come out wrong. */
const RF = require("../lib.js");
const { campusCSV, CLASSES } = require("./campus-fixture.js");

let pass = 0, fail = 0;
const ok = (name, cond, extra) => {
  if (cond) { pass++; console.log("  ok   " + name); }
  else { fail++; console.log("  FAIL " + name + (extra !== undefined ? "  -> " + JSON.stringify(extra) : "")); }
};
const eq = (name, got, want) => ok(name + "  (" + JSON.stringify(got) + ")", JSON.stringify(got) === JSON.stringify(want), got);
const group = t => console.log("\n" + t);
const pick = n => [n.first, n.last];

/* ------------------------------------------------ pieces */
group("grade + teacher in one cell");
eq("JK - Ms. Harper's Class", RF.splitGroupTeacher("JK - Ms. Harper's Class"), { group: "JK", teacher: "Ms. Harper's Class" });
eq("Second Grade - Mrs. Davies' Class", RF.splitGroupTeacher("Second Grade - Mrs. Davies' Class").group, "Second Grade");
eq("teacher first works too", RF.splitGroupTeacher("Mrs. Pellham - 1st").group, "1st");
eq("no dash", RF.splitGroupTeacher("2nd Grade Mrs. Pellham"), { group: "2nd Grade", teacher: "Mrs. Pellham" });
eq("combined grades", RF.splitGroupTeacher("Seventh & Eighth Grade - Mr. Tabor's Class").group, "Seventh & Eighth Grade");
eq("a plain teacher is not split", RF.splitGroupTeacher("Mrs. Pellham"), null);
eq("a room is not a grade", RF.splitGroupTeacher("Room 12 - Mrs. Pellham"), null);
["TK", "JK", "PK", "Pre-K", "K", "Kinder", "Kindergarten", "1st", "12th", "First Grade", "Twelfth Grade",
  "Grade 1", "Grade 12", "Grade One", "Grade Twelve", "5th/6th", "Fifth & Sixth Grade"]
  .forEach(g => ok("grade word: " + g, RF.gradePhrase(g) >= 0, RF.gradePhrase(g)));
["Mrs. Pellham", "Room 12", "Grade 13", "2026", "Art"].forEach(g => ok("not a grade: " + g, RF.gradePhrase(g) < 0));

group("teacher names");
eq("'s Class trimmed", RF.normTeacher("Ms. Harper's Class").value, "Ms. Harper");
eq("' Class trimmed", RF.normTeacher("Mrs. Davies' Class").value, "Mrs. Davies");
eq("bare Class trimmed", RF.normTeacher("Mr. Tabor Class").value, "Mr. Tabor");
eq("a teacher called Class is left alone", RF.normTeacher("Class").value, "Class");
eq("shouting still tidied", RF.normTeacher("MRS PELLHAM").value, "Mrs. Pellham");
eq("JK is never Jk", RF.fixCase("JK - Ms. Harper"), "JK - Ms. Harper");
eq("TK is never Tk, even alone", RF.fixCase("TK"), "TK");
eq("a short capital word in a mixed line stays", RF.normTeacher("Ms. MJ Lane").value, "Ms. MJ Lane");
eq("...but a shouting name is still fixed", pick(RF.splitName("EMMA LI")), ["Emma", "Li"]);
eq("same teacher, two spellings, one key", RF.teacherKey("Mrs. Davies' Class"), RF.teacherKey("Mrs. Davies"));

group("notes inside a name");
["Sawyer Hale (Male)", "Sawyer Hale (male)", "Sawyer Hale (Boy)", "Sawyer Hale (M)"]
  .forEach(n => eq(n, pick(RF.splitName(n)), ["Sawyer", "Hale"]));
eq("(girl)", pick(RF.splitName("Noah Vance (girl)")), ["Noah", "Vance"]);
eq("gender note reported", RF.splitName("Ava Corwin (Female)").gender, "Female");
ok("a gender note is not a question", RF.splitName("Ava Corwin (Female)").confidence === "sure");
eq("nickname becomes the first name", pick(RF.splitName("Elizabeth (Tessa) Quill")), ["Tessa", "Quill"]);
eq("...and the legal name is kept", RF.splitName("Elizabeth (Tessa) Quill").legalFirst, "Elizabeth");
eq("quoted nickname", pick(RF.splitName('Robert "Bobby" Lane')), ["Bobby", "Lane"]);
eq("nickname settles a two-word first name", RF.splitName("Mary Kate (Molly) Smith").confidence, "likely");
eq("an office note is dropped, not used", pick(RF.splitName("Ana Ruiz (new)")), ["Ana", "Ruiz"]);
ok("no last name ever starts with a bracket",
  ["Sawyer (Male)", "Sawyer Hale (", "Sawyer Hale (Male", "(Tessa) Quill"].every(n => !/^[(]/.test(RF.splitName(n).last)),
  ["Sawyer (Male)", "Sawyer Hale (", "Sawyer Hale (Male", "(Tessa) Quill"].map(n => RF.splitName(n).last));

group("parent names in one cell");
const names = raw => RF.splitParentNames(raw).map(n => n.first + " " + n.last);
eq("&", names("Jane Doe & Chris Brandt"), ["Jane Doe", "Chris Brandt"]);
eq("and, shared surname", names("John and Mary Smith"), ["John Smith", "Mary Smith"]);
eq("/", names("Pat / Sam Ashby"), ["Pat Ashby", "Sam Ashby"]);
eq("+", names("Kim + Lee Vance"), ["Kim Vance", "Lee Vance"]);
eq("one parent", names("Ellen Marsh"), ["Ellen Marsh"]);
ok("names column recognised", RF.looksLikeNames("Jane Doe & Chris Brandt").joined);
ok("an email is not names", !RF.looksLikeNames("jane@example.com").names);
ok("a yes/no flag is not names", !RF.looksLikeNames("Yes").names);
ok("janedoe@ is Jane Doe", RF.emailScore({ first: "Jane", last: "Doe" }, "janedoe@x.com") >
  RF.emailScore({ first: "Chris", last: "Brandt" }, "janedoe@x.com"));
ok("cbrandtcoaching@ is Chris Brandt", RF.emailScore({ first: "Chris", last: "Brandt" }, "cbrandtcoaching@x.com") > 0);
const pd = RF.pairNames([{ first: "Chris", last: "Brandt" }, { first: "Jane", last: "Doe" }],
  [{ email: "janedoe@x.com" }, { email: "cbrandtcoaching@x.com" }]);
eq("names follow their emails", pd.pick, [1, 0]);
ok("...without a guess flag", !pd.guessed);
const pg = RF.pairNames([{ first: "Pat", last: "Ashby" }, { first: "Sam", last: "Ashby" }],
  [{ email: "ashbyfamily@x.com" }, { email: "theashbys@x.com" }]);
eq("no clue in the emails: column order", pg.pick, [0, 1]);
ok("...and flagged", pg.guessed);

group("column mapping");
["Mom Phone", "Mom Cell", "Mother Mobile", "Mom Email", "Guardian 1 Phone", "Parent 1 Email", "Parent 1 Cell"]
  .forEach(h => { const d = RF.detectColumn(h); ok(h + " -> parent 1", /parent_(cell|email)/.test(d.field) && d.prefer === 1, d); });
["Dad Phone", "Dad Cell", "Father Mobile", "Dad Email", "Guardian 2 Phone", "Parent 2 Email", "Parent 2 Cell"]
  .forEach(h => { const d = RF.detectColumn(h); ok(h + " -> parent 2", /parent_(cell|email)/.test(d.field) && d.prefer === 2, d); });
ok("phone, cell and mobile all count", ["Mom Phone", "Mom Cell", "Mom Mobile"].every(h => RF.detectColumn(h).conf === "sure"));
eq("Teacher First + Teacher Last are halves of one name",
  ["Teacher First Name", "Teacher Last Name"].map(h => RF.detectColumn(h).teacherPart), ["first", "last"]);
const tl = RF.analyze(RF.readWorkbook(null, "Student First,Student Last,Grade,Teacher First Name,Teacher Last Name\n" +
  "Ada,Birch,3,Ann,Pellham\nBen,Calder,3,Ann,Pellham", "t.csv"), {});
eq("...and come out as one teacher", tl.students[0].teacher, "Ann Pellham");

/* ------------------------------------------------ the whole roster */
group("the campus roster");
const book = RF.readWorkbook(null, campusCSV(), "Campus Roster.csv");
const r = RF.analyze(book, {});
const col = h => r.sheets[0].cols.find(c => c.header === h);
const by = n => r.students.find(s => s.first + " " + s.last === n);
const rows = RF.readyTable(r);
const cell = (s, name) => rows.rows[r.students.indexOf(s)][rows.columns.indexOf(name)];

eq("Class is split, not read as the teacher", col("Class").field, "group_teacher");
ok("...without asking", col("Class").conf === "sure");
eq("Parent(s) is exported as names", col("Parent(s)").field, "parent_names");
["Mom Phone", "Mom Email"].forEach(h => eq(h + " maps on its own to Parent 1", [col(h).overridden, col(h).slot], [false, 1]));
["Dad Phone", "Dad Email"].forEach(h => eq(h + " maps on its own to Parent 2", [col(h).overridden, col(h).slot], [false, 2]));
eq("nothing left unexported", r.unused.length, 0);

eq("the export has a Group column", rows.columns.slice(0, 5),
  ["Student First Name", "Student Last Name", "Group", "Teacher", "Student ID"]);
eq("Missing grade: 0", r.stats.counts["missing-grade"], 0);
ok("every student has a Group", r.students.every(s => s.grade));
eq("Group is the grade as the school wrote it", ["Sawyer Hale", "Ava Corwin", "Logan Pratt", "Hadley Royce"]
  .map(n => cell(by(n), "Group")), ["JK", "Kinder", "First Grade", "Fifth & Sixth Grade"]);
eq("Teacher is the trimmed name", ["Sawyer Hale", "Noah Vance", "Hadley Royce"].map(n => cell(by(n), "Teacher")),
  ["Ms. Harper", "Mrs. Davies", "Mr. Tabor"]);
ok("no \"Class\" left in any teacher", r.students.every(s => !/class/i.test(s.teacher)));
ok("no Jk anywhere", !/\bJk\b/.test(JSON.stringify(rows)));

const labels = RF.labelStats(RF.labelPages(r.students));
eq("one label class per distinct Class value", labels.classes, CLASSES.length);
eq("label classes run in grade order", RF.labelClasses(r.students).map(c => c.grade),
  ["JK", "JK", "Kinder", "First Grade", "First Grade", "Second Grade", "Fifth & Sixth Grade"]);
eq("label class line", RF.labelClasses(r.students)[0].title, "JK · Miss Quinley");

const nameCells = rows.rows.map(row => [0, 1].concat(rows.columns.map((c, i) => /^Parent (First|Last) Name/.test(c) ? i : -1)
  .filter(i => i >= 0)).map(i => row[i]).join(" ")).join(" ");
ok("no bracket in any exported name", !/[()]/.test(nameCells));
ok("no gender word in any exported name", !/\b(male|female|girl|boy)\b/i.test(nameCells));
eq("gender notes logged", r.stats.genderNotes, 5);
ok("...in the student's own trace", by("Sawyer Hale").changes.some(c => /\(Male\)/.test(c)));
const reviewNames = r.issues.filter(i => i.type === "name-parse").map(i => i.raw);
ok("gender-noted names are not in split review",
  !reviewNames.some(n => /\(/.test(n)), reviewNames);

const tessa = by("Tessa Quill");
ok("Elizabeth (Tessa) Quill -> first Tessa, last Quill", !!tessa);
eq("legal first name kept", tessa && tessa.legalFirst, "Elizabeth");
ok("...and written into the Source Trace", RF.toCSV(RF.traceTable(r)).indexOf("legal first name: Elizabeth") >= 0);
eq("no Eli / Elizabeth duplicate prompt", r.reviews.filter(x => x.type === "possible-duplicate").length, 0);

const juno = by("Juno Brandt");
eq("Parent 1 is the name that owns the Mom email", [juno.contacts[0].first, juno.contacts[0].last, juno.contacts[0].email],
  ["Jane", "Doe", "janedoe@example.com"]);
eq("Parent 2 likewise", [juno.contacts[1].first, juno.contacts[1].last], ["Chris", "Brandt"]);
eq("shared surname reaches both parents", by("Sawyer Hale").contacts.map(c => c.first + " " + c.last),
  ["Lara Hale", "Tom Hale"]);
eq("a shared family email does not swallow a parent", by("Wes Fenwick").contacts.map(c => c.first + " " + c.last),
  ["Nora Fenwick", "Glen Fenwick"]);
ok("every parent exported has a name", r.students.every(s => s.contacts.every(c => c.first && c.last)));
const order = r.issues.filter(i => i.type === "parent-order");
eq("only the families whose emails cannot tell them apart are flagged for parent order",
  order.map(i => i.student.last).sort(), ["Ashby", "Fenwick"]);

eq("names needing a split check: the two first-middle-last names", reviewNames.sort(),
  ["Emmy Rose Talbot", "Lydia Jane Marsh"]);
eq("the sanity pass is clean", r.sanity, []);

/* ------------------------------------------------ the sanity pass bites */
group("sanity pass on a broken mapping");
const mapAs = (pairs) => {
  const m = {};
  Object.keys(pairs).forEach(h => { m[col(h).mapKey] = pairs[h]; });
  return RF.analyze(book, { mapping: m });
};
const asTeacher = mapAs({ Class: "teacher" });
const ids = res => res.sanity.map(x => x.id.split(":")[0]);
ok("the old mapping (Class as Teacher) is caught: grade blank for most rows", ids(asTeacher).indexOf("blank-grade") >= 0, ids(asTeacher));
ok("...and the warning says it is a mapping problem",
  /mapping problem/.test(asTeacher.sanity.find(x => x.id === "blank-grade").text));
const noClass = mapAs({ Class: "ignore" });
ok("one label class for 40+ students is caught", ids(noClass).indexOf("one-class") >= 0, ids(noClass));
const noParents = mapAs({ "Parent(s)": "ignore" });
ok("an unexported column of names is caught", ids(noParents).indexOf("names-unused") >= 0, ids(noParents));
const broken = Object.assign({}, r, { students: r.students.map((s, i) => i ? s : Object.assign({}, s, { last: "(Male)" })) });
ok("a bracket in an exported name is caught", RF.sanityChecks(broken, { capsChanged: [], hasTeacher: true })
  .some(x => x.id === "odd-names"));
ok("a JK turned into Jk is caught", RF.sanityChecks(r, { capsChanged: [{ from: "JK", to: "Jk" }], hasTeacher: true })
  .some(x => x.id === "caps"));
ok("the report lists the sanity checks", RF.toCSV(RF.reportTable(asTeacher)).indexOf("Group (the grade) is blank") >= 0);

console.log("\n" + pass + " passed, " + fail + " failed");
if (typeof process !== "undefined" && process.exit) process.exit(fail ? 1 : 0);
