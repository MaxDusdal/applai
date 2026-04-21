#set document(title: "CV", author: "Candidate Name")
#set page(margin: (x: 2cm, y: 2cm))
#set text(size: 10pt)
#set par(leading: 0.65em)

// ─── Header ───────────────────────────────────────────────────────
#align(center)[
  #text(size: 24pt, weight: "bold")[Candidate Name]
  #v(4pt)
  #text(size: 10pt, fill: rgb("#555"))[
    email\@example.com #sym.dot.c +49 123 456789 #sym.dot.c Berlin, Germany
  ]
  #v(2pt)
  #text(size: 9pt, fill: rgb("#888"))[
    github.com/username #sym.dot.c linkedin.com/in/username
  ]
]

#v(12pt)
#line(length: 100%, stroke: 0.5pt + rgb("#ddd"))
#v(8pt)

// ─── Summary ──────────────────────────────────────────────────────
#text(size: 12pt, weight: "bold")[Professional Summary]
#v(4pt)
// Replace this with a concise professional summary tailored to the target role.

#v(12pt)

// ─── Experience ───────────────────────────────────────────────────
#text(size: 12pt, weight: "bold")[Experience]
#v(6pt)

// Entry format:
// #text(weight: "bold")[Role Title] — Company | Location \
// #text(style: "italic", fill: rgb("#666"))[Start – End] \
// - Achievement or responsibility with metrics \
// - Another key point

#v(12pt)

// ─── Education ────────────────────────────────────────────────────
#text(size: 12pt, weight: "bold")[Education]
#v(6pt)

// Entry format:
// #text(weight: "bold")[Degree] — Institution \
// #text(style: "italic", fill: rgb("#666"))[Start – End]

#v(12pt)

// ─── Skills ───────────────────────────────────────────────────────
#text(size: 12pt, weight: "bold")[Skills]
#v(4pt)

// Organize by category, e.g.:
// *Languages & Frameworks:* TypeScript, Python, Go, React, Next.js \
// *Cloud & Infrastructure:* AWS, Docker, Kubernetes \
// *Databases:* PostgreSQL, Redis, MongoDB
