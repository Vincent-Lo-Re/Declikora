import { describe, expect, it } from "vitest"

import { usesCsv } from "@/lib/media/uses-export"
import { texts } from "@/texts"

const csv = texts.media.uses.csv

describe("export des utilisations d'un fichier", () => {
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
})
