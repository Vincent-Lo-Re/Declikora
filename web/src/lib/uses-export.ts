// Où un fichier ou une catégorie est utilisé : les contenus qui le citent, et leur export en CSV
// (Excel, Numbers, Google Sheets), dans la langue de l'admin. Sans React.

import { contentEditorPath, contentSection } from "@/navigation"
import { texts } from "@/texts"

/**
 * Un contenu qui utilise un fichier ou une catégorie : dans son brouillon (in_draft), dans sa
 * version en ligne (in_app) et, quand on le sait (catégories), s'il est à la Corbeille.
 */
export type ContentUse = {
  content_id: string
  kind: string
  title: string
  in_draft: boolean
  in_app: boolean
  in_trash?: boolean
}

const words = texts.uses

// Un champ entre guillemets dès qu'il contient un séparateur, un guillemet ou un retour à la
// ligne ; un guillemet se double (RFC 4180).
function field(value: string): string {
  return /[",;\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

/**
 * Le CSV des utilisations : une ligne par contenu (titre, section, dans un brouillon, en ligne,
 * à la Corbeille quand on le sait, adresse de son éditeur). origin : l'adresse de l'admin
 * (« https://admin.declikora.app »), pour des liens qui s'ouvrent hors de l'admin.
 */
export function usesCsv(uses: readonly ContentUse[], origin: string): string {
  const { csv } = words
  const withTrash = uses.some((use) => use.in_trash !== undefined)
  const yesNo = (value: boolean) => (value ? csv.yes : csv.no)
  const header = [
    csv.title,
    csv.section,
    csv.draft,
    csv.live,
    ...(withTrash ? [csv.trash] : []),
    csv.url,
  ]
  const rows = uses.map((use) => {
    const section = contentSection(use.kind)
    const path = contentEditorPath(use.kind, use.content_id)
    return [
      use.title?.trim() || texts.common.untitled,
      section ? texts.sections[section].title : "",
      yesNo(use.in_draft),
      yesNo(use.in_app),
      ...(withTrash ? [yesNo(use.in_trash ?? false)] : []),
      path ? `${origin}${path}` : "",
    ]
  })
  // Fins de ligne CRLF, comme le veut le format.
  return [header, ...rows].map((row) => row.map(field).join(",")).join("\r\n")
}

/**
 * Télécharge le CSV des utilisations sous ce nom. Le BOM en tête dit à Excel que le texte est en
 * UTF-8 (sans lui, les accents s'y affichent mal).
 */
export function downloadUsesCsv(fileName: string, uses: readonly ContentUse[]) {
  const blob = new Blob([`﻿${usesCsv(uses, window.location.origin)}`], {
    type: "text/csv;charset=utf-8",
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = fileName
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
