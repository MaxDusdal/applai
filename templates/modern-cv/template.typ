#let data = yaml("content.yml")

#set page(margin: (x: 0.8in, top: 0.5in, bottom: 0.5in), paper: "a4")
#set text(font: ("Libertinus Serif", "Times New Roman"), size: 11pt, lang: "en")
#set par(justify: false, spacing: 0.65em)
#set list(indent: 1em, spacing: 0.8em)

// ─── Header ───────────────────────────────────────────────────────
#align(center)[
  #block(above: 0pt, below: 0.6em, text(size: 22pt, weight: "bold")[#data.name])
  #block(above: 0.8em, below: 0.6em, text(size: 10pt, tracking: 0.08em, smallcaps(data.title)))
  #block(above: 0.8em, below: 0pt, text(size: 10pt)[#data.address • #data.email • #data.phone])
]

#v(1.3em)

// ─── Helpers ──────────────────────────────────────────────────────
#let section_head(title) = {
  v(0.2em)
  text(size: 13pt, weight: "bold", smallcaps(title))
  v(-0.6em)
  line(length: 100%, stroke: 0.4pt + luma(40%))
  v(0.3em)
}

#let timeline_item(title, subtitle, date, bullets: none) = {
  block(width: 100%, breakable: false)[
    #text(weight: "bold")[#title] #h(0.5em) #text(style: "italic")[#subtitle] #h(1fr) #text(style: "italic")[#date] \
    #if bullets != none {
      v(0.3em)
      for bullet in bullets {
        if type(bullet) == str [
          - #bullet
          #v(0.3em)
        ] else if type(bullet) == dictionary [
          - #text(weight: "bold")[#bullet.title] #bullet.topic
            #v(0.2em)
            #set list(marker: "◦", indent: 0.5em)
            #list(..bullet.subbullets)
          #v(0.3em)
        ]
      }
    }
  ]
  v(0.65em)
}

#let list_item(title, content) = {
  block(width: 100%, breakable: false)[
    #text(weight: "bold")[#title:] #content
  ]
  v(0.5em)
}

// ─── Education ────────────────────────────────────────────────────
#section_head("Education")
#for edu in data.education {
  timeline_item(edu.degree, edu.institution, edu.date, bullets: edu.at("bullets", default: none))
}

// ─── Experience ───────────────────────────────────────────────────
#section_head("Experience")
#for exp in data.experience {
  timeline_item(exp.title, exp.company, exp.date, bullets: exp.at("bullets", default: none))
}

// ─── Skills ───────────────────────────────────────────────────────
#section_head("Skills")
#for skill_group in data.skills {
  list_item(skill_group.category, skill_group.items.join(", "))
}
#v(0.3em)

// ─── Volunteering ─────────────────────────────────────────────────
#if "volunteering" in data [
  #section_head("Volunteering")
  #for item in data.volunteering {
    list_item(item.title, item.desc)
  }
  #v(0.65em)
]

// ─── Languages & Interests ────────────────────────────────────────
#let footer_items = ()
#let lang_strings = data.languages.map(l => l.name + " (" + l.proficiency + ")")
#footer_items.push([#text(weight: "bold")[Spoken Languages:] #lang_strings.join(", ")])
#footer_items.push("|")
#footer_items.push([#text(weight: "bold")[Interests:] #data.interests.join(", ")])
#block(width: 100%, breakable: false)[
  #footer_items.join([#h(1fr) ])
]
