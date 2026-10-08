import { describe, expect, it } from "vitest"

import { usesCsv } from "@/lib/uses-export"
import { texts } from "@/texts"

const csv = texts.uses.csv

describe("export des utilisations", () => {
  it("une ligne par contenu, l'adresse de son éditeur, les champs délicats entre guillemets", () => {
    const text = usesCsv(
      [
        {
          content_id: "a1",
          kind: "article",
          title: 'Dormir, "vraiment"',
          in_draft: true,
          in_app: false,
        },
        {
          content_id: "p1",
          kind: "page",
          title: " ",
          in_draft: false,
          in_app: true,
        },
      ],
      "https://admin.exemple.test"
    )
    expect(text.split("\r\n")).toEqual([
      [csv.title, csv.section, csv.draft, csv.live, csv.url].join(","),
      `"Dormir, ""vraiment""",${texts.sections.blog.title},${csv.yes},${csv.no},https://admin.exemple.test/blog/a1`,
      `${texts.common.untitled},${texts.sections.pages.title},${csv.no},${csv.yes},https://admin.exemple.test/pages/p1`,
    ])
  })

  it("la colonne « Dans la Corbeille » quand on la connaît (catégories)", () => {
    const [header, row] = usesCsv(
      [
        {
          content_id: "e1",
          kind: "episode",
          title: "Respirer",
          in_draft: true,
          in_app: false,
          in_trash: true,
        },
      ],
      "https://admin.exemple.test"
    ).split("\r\n")
    expect(header).toBe(
      [csv.title, csv.section, csv.draft, csv.live, csv.trash, csv.url].join(
        ","
      )
    )
    expect(row).toBe(
      `Respirer,${texts.sections.podcasts.title},${csv.yes},${csv.no},${csv.yes},https://admin.exemple.test/podcasts/e1`
    )
  })

  it("un modèle copié : la colonne « Copié » au lieu de brouillon et en ligne", () => {
    const [header, row] = usesCsv(
      [
        {
          content_id: "a1",
          kind: "article",
          title: "Bien dormir",
          in_draft: false,
          in_app: false,
          in_trash: false,
          copied: true,
        },
      ],
      "https://admin.exemple.test"
    ).split("\r\n")
    expect(header).toBe(
      [csv.title, csv.section, csv.copied, csv.trash, csv.url].join(",")
    )
    expect(row).toBe(
      `Bien dormir,${texts.sections.blog.title},${csv.yes},${csv.no},https://admin.exemple.test/blog/a1`
    )
  })
})
