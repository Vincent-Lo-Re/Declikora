import { describe, expect, it } from "vitest"

import type { TrashItem } from "@/lib/media/api"
import {
  filterTrash,
  groupTrash,
  trashFilters,
  trashTitle,
  trashTypeLabel,
} from "@/lib/trash"

function item(changes: Partial<TrashItem>): TrashItem {
  return {
    item_type: "content",
    id: "id",
    kind: "page",
    title: "Titre",
    trash_batch: null,
    batch_root: true,
    deleted_at: "2026-09-27T12:30:00Z",
    deleted_by_name: null,
    purge_at: "2026-10-27T12:30:00Z",
    purge_error: null,
    ...changes,
  }
}

const photo = item({ item_type: "file", id: "f1", kind: "image" })
const page = item({ id: "p1", kind: "page", trash_batch: "lot-p" })
// Un lot : un élément et ce qui est parti avec lui (batch_root faux).
const article = item({ id: "a1", kind: "article", trash_batch: "lot-a" })
const partOne = item({
  id: "a2",
  kind: "article",
  trash_batch: "lot-a",
  batch_root: false,
})
const partTwo = item({
  id: "a3",
  kind: "article",
  trash_batch: "lot-a",
  batch_root: false,
})
const template = item({ id: "t1", kind: "template", trash_batch: "lot-t" })

describe("corbeille", () => {
  it("range sous un élément ce qui est parti avec lui", () => {
    const entries = groupTrash([partOne, photo, article, partTwo, page])
    expect(entries.map((entry) => entry.item.id)).toEqual(["f1", "a1", "p1"])
    expect(entries[1].batch.map((part) => part.id)).toEqual(["a2", "a3"])
  })

  it("garde visible un élément dont la tête de lot manque", () => {
    expect(groupTrash([partOne]).map((entry) => entry.item.id)).toEqual(["a2"])
  })

  it("ne propose que les types présents, toujours dans le même ordre", () => {
    expect(trashFilters([])).toEqual(["all"])
    expect(trashFilters([photo, template, page])).toEqual([
      "all",
      "page",
      "template",
      "file",
    ])
  })

  it("filtre par type", () => {
    const entries = groupTrash([photo, article, partOne, page, template])
    expect(
      filterTrash(entries, "article").map((entry) => entry.item.id)
    ).toEqual(["a1"])
    expect(filterTrash(entries, "file").map((entry) => entry.item.id)).toEqual([
      "f1",
    ])
    expect(filterTrash(entries, "all")).toHaveLength(4)
    expect(filterTrash(entries, "episode")).toEqual([])
  })

  it("nomme le type et le titre", () => {
    expect(trashTypeLabel(photo)).toBe("Fichier · Image")
    expect(trashTypeLabel(template)).toBe("Modèle de bloc")
    expect(trashTitle(item({ title: null }))).toBe("Sans titre")
    expect(trashTitle(item({ title: "  " }))).toBe("Sans titre")
  })
})
