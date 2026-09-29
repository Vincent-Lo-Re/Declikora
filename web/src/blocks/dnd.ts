// Glisser-déposer des blocs, sans React : où va un bloc, et ce qui est refusé
// (docs/ARCHITECTURE-CONTENUS.md, § 2.7). Un SortableContext pour la page, un par encadré,
// chacun dans une zone de dépôt (pour déposer dans un encadré vide).

import {
  closestCenter,
  pointerWithin,
  type CollisionDetection,
  type UniqueIdentifier,
} from "@dnd-kit/core"

import { blocksOf, canDropInto, findBlock, moveBlock } from "@/blocks/draft"
import {
  ROOT,
  type BlockType,
  type ContainerId,
  type Draft,
} from "@/blocks/types"

const ZONE_PREFIX = "zone:"

/** La zone de dépôt d'un encadré. */
export function zoneId(boxId: string): string {
  return `${ZONE_PREFIX}${boxId}`
}

function boxOfZone(id: UniqueIdentifier): string | null {
  const value = String(id)
  return value.startsWith(ZONE_PREFIX) ? value.slice(ZONE_PREFIX.length) : null
}

/** Ce que porte chaque cible de dépôt (data de useSortable et useDroppable). */
export type DropData =
  | { kind: "block"; type: BlockType; container: ContainerId }
  | { kind: "zone"; container: ContainerId }

/** Le conteneur visé par une cible : la page, ou un encadré. */
export function targetContainer(
  draft: Draft,
  overId: UniqueIdentifier
): ContainerId | null {
  const zone = boxOfZone(overId)
  if (zone) return zone
  return findBlock(draft, String(overId))?.container ?? null
}

/** Vrai si le bloc actif peut aller dans le conteneur de la cible. */
export function canDropOn(
  draft: Draft,
  activeId: UniqueIdentifier,
  overId: UniqueIdentifier
): boolean {
  const active = findBlock(draft, String(activeId))
  const container = targetContainer(draft, overId)
  if (!active || !container) return false
  if (container === active.block.id) return false
  return canDropInto(active.block.type, container)
}

/**
 * Pendant le survol : le bloc passe dans un autre conteneur (de la page vers un encadré, ou
 * l'inverse), juste avant ou après la cible. Null si rien ne change ou si c'est refusé.
 */
export function moveOver(
  draft: Draft,
  activeId: UniqueIdentifier,
  overId: UniqueIdentifier,
  below: boolean
): Draft | null {
  const active = findBlock(draft, String(activeId))
  const container = targetContainer(draft, overId)
  if (!active || !container || container === active.container) return null
  if (!canDropOn(draft, activeId, overId)) return null
  const zone = boxOfZone(overId)
  const index = zone
    ? blocksOf(draft, container).length
    : (findBlock(draft, String(overId))?.index ?? 0) + (below ? 1 : 0)
  return moveBlock(draft, String(activeId), container, index)
}

/** Au dépôt : le bloc prend la place de la cible, dans le même conteneur. */
export function moveOnDrop(
  draft: Draft,
  activeId: UniqueIdentifier,
  overId: UniqueIdentifier
): Draft | null {
  if (activeId === overId) return null
  const active = findBlock(draft, String(activeId))
  const over = findBlock(draft, String(overId))
  if (!active || !over || active.container !== over.container) return null
  const index = over.index > active.index ? over.index + 1 : over.index
  return moveBlock(draft, String(activeId), over.container, index)
}

/**
 * Détection des cibles : on ne propose jamais un encadré (ou un bloc lié) comme cible dans un
 * encadré, ni au pointeur ni au clavier (les annonces n'en parlent donc pas). Au pointeur, la
 * cible la plus intérieure gagne : un bloc d'un encadré, puis la zone de l'encadré, puis la page.
 */
export const blocksCollision: CollisionDetection = (args) => {
  const activeType =
    (args.active.data.current as DropData | undefined)?.kind === "block"
      ? (args.active.data.current as { type: BlockType }).type
      : null
  const allowed = args.droppableContainers.filter((container) => {
    const data = container.data.current as DropData | undefined
    if (!data) return false
    return activeType === null || canDropInto(activeType, data.container)
  })

  // L'encadré qui contient déjà le bloc déplacé (null s'il est dans la page).
  const activeData = args.active.data.current as DropData | undefined
  const ownBox =
    activeData?.kind === "block" && activeData.container !== ROOT
      ? activeData.container
      : null

  if (args.pointerCoordinates) {
    const within = pointerWithin({ ...args, droppableContainers: allowed })
    const dataOf = (id: UniqueIdentifier) =>
      allowed.find((container) => container.id === id)?.data.current as
        DropData | undefined
    const child = within.find((collision) => {
      const data = dataOf(collision.id)
      return data?.kind === "block" && data.container !== ROOT
    })
    if (child) return [child]
    const zone = within.find(
      (collision) => dataOf(collision.id)?.kind === "zone"
    )
    if (zone) {
      const boxId = (dataOf(zone.id) as DropData).container
      const children = allowed.filter((container) => {
        const data = container.data.current as DropData
        return data.kind === "block" && data.container === boxId
      })
      const closest = closestCenter({ ...args, droppableContainers: children })
      return closest.length > 0 ? closest : [zone]
    }
    // Sur l'encadré qui contient déjà le bloc, mais hors de sa liste (marges, bouton
    // « Ajouter dans l'encadré ») : le bloc y reste. Pour sortir d'un encadré, on passe
    // au-dessus ou au-dessous de lui. Sans cette règle, le bloc sortirait, l'encadré
    // rétrécirait sous le pointeur, et le bloc rentrerait aussitôt.
    if (ownBox && within.some((collision) => collision.id === ownBox)) {
      return [{ id: zoneId(ownBox) }]
    }
    // Entre deux blocs (ou hors du téléphone) : aucune cible ; l'aperçu garde la dernière.
    return within
  }

  // Au clavier, depuis un encadré : une flèche qui mène au-dessus ou au-dessous de sa liste
  // fait sortir le bloc, juste avant ou juste après l'encadré.
  const list = ownBox ? args.droppableRects.get(zoneId(ownBox)) : undefined
  if (
    ownBox &&
    list &&
    (args.collisionRect.top < list.top - 1 ||
      args.collisionRect.top > list.bottom)
  ) {
    return [{ id: ownBox }]
  }
  // Sinon : la cible la plus proche parmi celles permises.
  return closestCenter({ ...args, droppableContainers: allowed })
}
