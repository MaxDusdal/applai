#let data = yaml("content.yml")

#set document(title: "Cover Letter", author: data.sender.name)
#set page(margin: (x: 2.5cm, y: 2.5cm), paper: "a4")
#set text(size: 11pt)
#set par(justify: true, leading: 0.8em)

// ─── Sender ───────────────────────────────────────────────────────
#align(right)[
  #data.sender.name \
  #data.sender.address \
  #data.sender.city \
  #data.sender.email \
  #data.sender.phone
]

#v(24pt)

// ─── Recipient ────────────────────────────────────────────────────
#data.recipient.name \
#data.recipient.company \
#data.recipient.address

#v(12pt)

// ─── Date ─────────────────────────────────────────────────────────
#datetime.today().display("[month repr:long] [day], [year]")

#v(12pt)

// ─── Subject ──────────────────────────────────────────────────────
#text(weight: "bold")[Re: Application for #data.role]

#v(12pt)

// ─── Body ─────────────────────────────────────────────────────────
Dear #data.recipient.name,

#v(8pt)
#data.opening

#for paragraph in data.body [
  #v(8pt)
  #paragraph
]

#v(8pt)
#data.closing

#v(24pt)
#data.salutation,

#v(36pt)
#data.sender.name
