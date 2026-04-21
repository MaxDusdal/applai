#set document(title: "Cover Letter", author: "Candidate Name")
#set page(margin: (x: 2.5cm, y: 2.5cm))
#set text(size: 11pt)
#set par(justify: true, leading: 0.8em)

// ─── Sender ───────────────────────────────────────────────────────
#align(right)[
  Candidate Name \
  Street Address \
  City, Country \
  email\@example.com \
  +49 123 456789
]

#v(24pt)

// ─── Recipient ────────────────────────────────────────────────────
Hiring Manager Name \
Company Name \
Company Address

#v(12pt)

// ─── Date ─────────────────────────────────────────────────────────
#datetime.today().display("[month repr:long] [day], [year]")

#v(12pt)

// ─── Subject ──────────────────────────────────────────────────────
#text(weight: "bold")[Re: Application for Role Title]

#v(12pt)

// ─── Body ─────────────────────────────────────────────────────────
Dear Hiring Manager,

// Opening paragraph — state your intent and what drew you to this role.

// Paragraph 2 — highlight relevant professional experience and achievements.

// Paragraph 3 — mention personal projects or additional qualifications that set you apart.

// Paragraph 4 — bridge paragraph connecting your experience to the specific needs of the role.

// Closing paragraph — reiterate interest, mention your availability, and include a call to action.

Sincerely,

#v(24pt)

Candidate Name
