/* A made-up campus roster in the shape of a real one that went wrong: the
   grade and teacher share one "Class" column, gender notes sit in brackets
   after names, one child goes by a nickname, parents' names come joined in
   one "Parent(s)" column, and the contacts are Mom/Dad columns. Every name,
   email and phone number in here is invented. Never swap in a real roster:
   real children's names do not go in this repository. */

const CLASSES = [
  "JK - Ms. Harper's Class",
  "JK - Miss Quinley's Class",
  "Kinder - Mrs. Oduya's Class",
  "First Grade - Mrs. Pellham's Class",
  "First Grade - Mrs. Varga's Class",
  "Second Grade - Mrs. Davies' Class",
  "Fifth & Sixth Grade - Mr. Tabor's Class"
];

const FIRSTS = ["Ada", "Ben", "Cora", "Dev", "Esme", "Finn", "Gia", "Hugo", "Iris", "Jude", "Kit",
  "Lena", "Milo", "Nell", "Otis", "Pia", "Reed", "Sage", "Theo", "Uma", "Vic", "Wren", "Xavi", "Yara", "Zed"];
const LASTS = ["Abbot", "Birch", "Calder", "Dunmore", "Ellery", "Fairley", "Gorski", "Hollis", "Ingram",
  "Jessup", "Kerrow", "Lindqvist", "Marlow", "Norcott", "Oakes", "Penrose", "Quarles", "Rasmund"];

const phone = n => "(619) 555-" + String(1000 + n).slice(-4);

/* Every row: [Class, Student, Parent(s), Mom Phone, Mom Email, Dad Phone, Dad Email] */
function campusRows() {
  const rows = [];
  let n = 0;
  /* Plain two-word names, six per class, so the roster is big enough that
     "one class for the whole school" would be visibly wrong. */
  CLASSES.forEach((cls, c) => {
    for (let i = 0; i < 6; i++, n++) {
      const first = FIRSTS[n % FIRSTS.length], last = LASTS[(n * 7 + c) % LASTS.length] + (n >= 18 ? "e" : "");
      const mom = FIRSTS[(n + 5) % FIRSTS.length] + "a", dad = FIRSTS[(n + 11) % FIRSTS.length] + "o";
      rows.push([cls, first + " " + last, mom + " and " + dad + " " + last,
        phone(n * 2), (mom + last).toLowerCase() + n + "@example.com",
        phone(n * 2 + 1), dad.charAt(0).toLowerCase() + last.toLowerCase() + n + "@example.net"]);
    }
  });

  /* The patterns that broke. */
  rows.push(["JK - Ms. Harper's Class", "Sawyer Hale (Male)", "Lara and Tom Hale",
    phone(201), "lara.hale@example.com", phone(202), "tomhale@example.net"]);
  rows.push(["Kinder - Mrs. Oduya's Class", "Ava Corwin (Female)", "Mina and Joel Corwin",
    phone(203), "minacorwin@example.com", phone(204), "jcorwin@example.net"]);
  rows.push(["First Grade - Mrs. Pellham's Class", "Logan Pratt (female)", "Dana and Rob Pratt",
    phone(205), "danapratt@example.com", phone(206), "rpratt@example.net"]);
  rows.push(["Second Grade - Mrs. Davies' Class", "Noah Vance (girl)", "Kim and Lee Vance",
    phone(207), "kvance@example.com", phone(208), "leevance@example.net"]);
  rows.push(["Fifth & Sixth Grade - Mr. Tabor's Class", "Hadley Royce (Female)", "Bea and Sam Royce",
    phone(209), "bea.royce@example.com", phone(210), "samroyce@example.net"]);

  /* A nickname in the middle, and a different child whose name looks like it. */
  rows.push(["Second Grade - Mrs. Davies' Class", "Elizabeth (Tessa) Quill", "Rena Quill & Paul Strand",
    phone(211), "renaquill@example.com", phone(212), "pstrandbuilds@example.net"]);
  rows.push(["JK - Miss Quinley's Class", "Eli Quill", "Hope and Marcus Quill",
    phone(213), "hopeq@example.com", phone(214), "marcusq@example.net"]);

  /* Two parents with their own surnames, listed Dad first, so the names
     only line up with the Mom/Dad columns if the emails are read. */
  rows.push(["First Grade - Mrs. Varga's Class", "Juno Brandt", "Chris Brandt & Jane Doe",
    phone(215), "janedoe@example.com", phone(216), "cbrandtcoaching@example.net"]);

  /* A surname written once for two parents, and emails that cannot tell
     them apart: paired in column order and flagged. */
  rows.push(["Kinder - Mrs. Oduya's Class", "Rory Ashby", "Pat & Sam Ashby",
    phone(217), "ashbyfamily@example.com", phone(218), "theashbys@example.net"]);

  /* One family email for both parents: still two people. */
  rows.push(["Second Grade - Mrs. Davies' Class", "Wes Fenwick", "Nora and Glen Fenwick",
    phone(223), "thefenwicks@example.com", phone(224), "thefenwicks@example.com"]);

  /* First, middle, last: a real question about the first name. */
  rows.push(["Fifth & Sixth Grade - Mr. Tabor's Class", "Lydia Jane Marsh", "Ellen and Ray Marsh",
    phone(219), "ellenmarsh@example.com", phone(220), "raymarsh@example.net"]);
  rows.push(["First Grade - Mrs. Pellham's Class", "Emmy Rose Talbot", "Gwen and Ian Talbot",
    phone(221), "gwentalbot@example.com", phone(222), "iantalbot@example.net"]);
  return rows;
}

const HEADER = ["Class", "Student", "Parent(s)", "Mom Phone", "Mom Email", "Dad Phone", "Dad Email"];
const csvCell = v => (/[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v);
const campusCSV = () => [HEADER].concat(campusRows()).map(r => r.map(csvCell).join(",")).join("\r\n");

module.exports = { campusCSV, campusRows, CLASSES };
