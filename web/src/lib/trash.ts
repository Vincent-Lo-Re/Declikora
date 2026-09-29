// Corbeille commune (fichiers et contenus) : lots, filtre par type, libellés. Sans React.

import type { TrashItem } from "@/lib/media/api"
import { isMediaKind } from "@/lib/media/constants"
import { texts } from "@/texts"

// Filtre par type : les chapitres et les leçons sont rangés avec les méthodes.
const trashFilterOrder = [
  "page",
  "article",
  "episode",
  "method",
  "template",
  "file",
] as const

export type TrashType = (typeof trashFilterOrder)[number]
export type TrashFilter = "all" | TrashType

/** Le type d'un élément pour le filtre. */
function trashTypeOf(item: TrashItem): TrashType {
  if (item.item_type === "file") return "file"
  switch (item.kind) {
    case "chapter":
    case "lesson":
    case "method":
      return "method"
    case "page":
    case "article":
    case "episode":
    case "template":
      return item.kind
    default:
      return "page"
  }
}

/** « Tout », puis seulement les types présents dans la corbeille, toujours dans le même ordre. */
export function trashFilters(items: TrashItem[]): TrashFilter[] {
  const present = new Set(items.map(trashTypeOf))
  return ["all", ...trashFilterOrder.filter((type) => present.has(type))]
}

/** Un élément mis à la corbeille, avec ce qui est parti avec lui (même lot). */
export type TrashEntry = { item: TrashItem; batch: TrashItem[] }

/**
 * Regroupe les lots : les chapitres et les leçons partis avec leur méthode (batch_root faux)
 * sont rangés sous elle ; ils sont restaurés et effacés avec elle.
 */
export function groupTrash(items: TrashItem[]): TrashEntry[] {
  const roots = new Map<string, TrashEntry>()
  const entries: TrashEntry[] = []
  for (const item of items) {
    if (item.item_type === "content" && item.batch_root && item.trash_batch) {
      const entry = { item, batch: [] }
      roots.set(item.trash_batch, entry)
      entries.push(entry)
    } else if (item.item_type === "file" || item.batch_root) {
      entries.push({ item, batch: [] })
    }
  }
  for (const item of items) {
    if (item.item_type !== "content" || item.batch_root) continue
    const root = item.trash_batch ? roots.get(item.trash_batch) : undefined
    // Sans sa tête de lot (cas qui ne devrait pas arriver), l'élément reste visible seul.
    if (root) root.batch.push(item)
    else entries.push({ item, batch: [] })
  }
  return entries
}

export function filterTrash(
  entries: TrashEntry[],
  filter: TrashFilter
): TrashEntry[] {
  if (filter === "all") return entries
  return entries.filter((entry) => trashTypeOf(entry.item) === filter)
}

/** Le nom affiché d'un élément (un contenu sans titre : « Sans titre »). */
export function trashTitle(item: TrashItem): string {
  return item.title?.trim() || texts.trash.untitled
}

/** Le type affiché : « Fichier · Image », « Page », « Leçon »… */
export function trashTypeLabel(item: TrashItem): string {
  if (item.item_type === "file") {
    const type = texts.trash.itemTypes.file
    return isMediaKind(item.kind)
      ? `${type} · ${texts.media.kinds[item.kind]}`
      : type
  }
  const kinds = texts.trash.contentKinds
  return Object.hasOwn(kinds, item.kind)
    ? kinds[item.kind as keyof typeof kinds]
    : texts.trash.itemTypes.content
}
