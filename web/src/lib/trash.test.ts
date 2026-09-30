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
    parent_title: null,
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
const method = item({ id: "m1", kind: "method", trash_batch: "lot-m" })
const chapter = item({
  id: "c1",
  kind: "chapter",
  trash_batch: "lot-m",
  batch_root: false,
  parent_title: "Méthode",
})
const lesson = item({
  id: "l1",
  kind: "lesson",
  trash_batch: "lot-m",
  batch_root: false,
})
// Une leçon mise seule à la corbeille : son propre lot.
const aloneLesson = item({ id: "l2", kind: "lesson", trash_batch: "lot-l" })

describe("corbeille", () => {
  it("range sous leur méthode les chapitres et leçons partis avec elle", () => {
    const entries = groupTrash([chapter, photo, method, lesson, page])
    expect(entries.map((entry) => entry.item.id)).toEqual(["f1", "m1", "p1"])
    expect(entries[1].batch.map((part) => part.id)).toEqual(["c1", "l1"])
  })

  it("garde visible un élément dont la tête de lot manque", () => {
    expect(groupTrash([chapter]).map((entry) => entry.item.id)).toEqual(["c1"])
  })

  it("ne propose que les types présents, toujours dans le même ordre", () => {
    expect(trashFilters([])).toEqual(["all"])
    expect(trashFilters([photo, lesson, page])).toEqual([
      "all",
      "method",
      "page",
      "file",
    ])
  })

  it("filtre par type : les chapitres et leçons vont avec les méthodes", () => {
    const entries = groupTrash([photo, method, chapter, page, aloneLesson])
    expect(
      filterTrash(entries, "method").map((entry) => entry.item.id)
    ).toEqual(["m1", "l2"])
    expect(filterTrash(entries, "file").map((entry) => entry.item.id)).toEqual([
      "f1",
    ])
    expect(filterTrash(entries, "all")).toHaveLength(4)
    expect(filterTrash(entries, "template")).toEqual([])
  })

  it("nomme le type et le titre", () => {
    expect(trashTypeLabel(photo)).toBe("Fichier · Image")
    expect(trashTypeLabel(chapter)).toBe("Chapitre")
    expect(trashTitle(item({ title: null }))).toBe("Sans titre")
    expect(trashTitle(item({ title: "  " }))).toBe("Sans titre")
  })
})
