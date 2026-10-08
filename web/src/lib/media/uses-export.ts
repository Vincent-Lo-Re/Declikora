// L'export des endroits où un fichier est utilisé (pastille « Utilisé » et fiche du fichier) :
// un CSV que lisent Excel, Numbers et Google Sheets, dans la langue de l'admin. Sans React.

import type { MediaUse } from "@/lib/media/api"
import { contentEditorPath, contentSection } from "@/navigation"
import { texts } from "@/texts"

const words = texts.media.uses

// Un champ entre guillemets dès qu'il contient un séparateur, un guillemet ou un retour à la
// ligne ; un guillemet se double (RFC 4180).
function field(value: string): string {
  return /[",;\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

/**
 * Le CSV des utilisations d'un fichier : une ligne par contenu (titre, section, dans un
 * brouillon, en ligne, adresse de son éditeur). origin : l'adresse de l'admin
 * (« https://admin.declikora.app »), pour des liens qui s'ouvrent hors de l'admin.
 */
export function usesCsv(uses: readonly MediaUse[], origin: string): string {
  const { csv } = words
  const yesNo = (value: boolean) => (value ? csv.yes : csv.no)
  const header = [csv.title, csv.section, csv.draft, csv.live, csv.url]
  const rows = uses.map((use) => {
    const section = contentSection(use.kind)
    const path = contentEditorPath(use.kind, use.content_id)
    return [
      use.title?.trim() || texts.common.untitled,
      section ? texts.sections[section].title : "",
      yesNo(use.in_draft),
      yesNo(use.in_app),
      path ? `${origin}${path}` : "",
    ]
  })
  // Fins de ligne CRLF, comme le veut le format.
  return [header, ...rows].map((row) => row.map(field).join(",")).join("\r\n")
}

/**
 * Télécharge le CSV des utilisations d'un fichier. Le BOM en tête dit à Excel que le texte est en
 * UTF-8 (sans lui, les accents s'y affichent mal).
 */
export function downloadUsesCsv(mediaName: string, uses: readonly MediaUse[]) {
  const blob = new Blob([`﻿${usesCsv(uses, window.location.origin)}`], {
    type: "text/csv;charset=utf-8",
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = words.fileName(mediaName.replace(/\.[^.]+$/, ""))
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
