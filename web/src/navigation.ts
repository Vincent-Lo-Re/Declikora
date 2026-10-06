import {
  ArchiveX,
  CircleUser,
  Images,
  Layers,
  LayoutDashboard,
  MicAudioLines,
  Rss,
  Sigma,
  SlidersVertical,
  SquareText,
  UserGroup,
  type LucideIcon,
} from "lucide-react"

import { texts } from "@/texts"

export type SectionKey = keyof typeof texts.sections

// Adresse (en français) et icône de chaque section.
/**
 * La route des pages avec le menu (AppLayout) : d'une de ces pages à l'autre, seul leur contenu
 * passe en fondu, le menu ne bouge pas (ADMIN § 7, « Une navigation sans à-coups »).
 */
export const menuRouteId = "menu"

export const sections = {
  home: { path: "/", icon: LayoutDashboard },
  blog: { path: "/blog", icon: Rss },
  podcasts: { path: "/podcasts", icon: MicAudioLines },
  methods: { path: "/methodes", icon: Sigma },
  pages: { path: "/pages", icon: SquareText },
  templates: { path: "/modeles", icon: Layers },
  media: { path: "/mediatheque", icon: Images },
  trash: { path: "/corbeille", icon: ArchiveX },
  team: { path: "/equipe", icon: UserGroup },
  settings: { path: "/parametres", icon: SlidersVertical },
  account: { path: "/mon-compte", icon: CircleUser },
} satisfies Record<SectionKey, { path: string; icon: LucideIcon }>

// Pages de connexion, sans le menu.
export const authPaths = {
  signIn: "/connexion",
  mfa: "/double-verification",
  invitation: "/invitation",
  signOut: "/deconnexion",
} as const

// Sections réservées aux admins : cachées dans le menu d'un éditeur.
export const adminOnlySections: readonly SectionKey[] = ["team", "settings"]

// Rangement du menu : l'accueil, puis les groupes, et en bas l'équipe et le compte.
export const menu = {
  top: ["home"],
  groups: [
    {
      label: texts.nav.groups.contents,
      items: ["blog", "podcasts", "methods", "pages"],
    },
    {
      label: texts.nav.groups.tools,
      items: ["templates", "media", "trash"],
    },
  ],
  bottom: ["team", "settings"],
} satisfies {
  top: SectionKey[]
  groups: { label: string; items: SectionKey[] }[]
  bottom: SectionKey[]
}

/** Adresse de l'éditeur d'un contenu : « /pages/<id> ». */
export function editorPath(section: SectionKey, contentId: string): string {
  return `${sections[section].path}/${contentId}`
}

// Section de l'éditeur de chaque sorte de contenu.
const editorSections: Partial<Record<string, SectionKey>> = {
  article: "blog",
  episode: "podcasts",
  method: "methods",
  page: "pages",
  template: "templates",
}

// Les éditeurs d'un chapitre, d'une leçon et d'un exercice, sous la section Méthodes :
// « /methodes/lecons/<id> ». L'adresse ne porte pas la méthode : l'éditeur la retrouve par le
// parent.
export const methodElementSegments = {
  chapter: "chapitres",
  lesson: "lecons",
  exercise: "exercices",
} as const

type MethodElementKind = keyof typeof methodElementSegments

function isMethodElementKind(kind: string): kind is MethodElementKind {
  return kind in methodElementSegments
}

/** Adresse de l'éditeur d'un chapitre, d'une leçon ou d'un exercice. */
function methodElementPath(kind: MethodElementKind, contentId: string): string {
  return `${sections.methods.path}/${methodElementSegments[kind]}/${contentId}`
}

/** Section d'un contenu d'après sa sorte (un élément d'une méthode : Méthodes), ou null. */
export function contentSection(kind: string): SectionKey | null {
  if (isMethodElementKind(kind)) return "methods"
  return editorSections[kind] ?? null
}

/** Adresse de l'éditeur d'un contenu d'après sa sorte, ou null si elle n'a pas d'éditeur. */
export function contentEditorPath(
  kind: string,
  contentId: string
): string | null {
  if (isMethodElementKind(kind)) return methodElementPath(kind, contentId)
  const section = contentSection(kind)
  return section ? editorPath(section, contentId) : null
}

/** Les catégories d'une section (Blog, Podcasts) : « /blog/categories ». */
export function categoriesPath(section: "blog" | "podcasts"): string {
  return `${sections[section].path}/categories`
}

/** La fiche d'un fichier dans la Médiathèque : « /mediatheque?fichier=<id> ». */
export function mediaFilePath(mediaId: string): string {
  return `${sections.media.path}?fichier=${encodeURIComponent(mediaId)}`
}

/** Vrai si l'adresse affichée appartient à la section (ou à l'une de ses pages). */
export function isInSection(path: string, pathname: string) {
  if (path === "/") return pathname === "/"
  return pathname === path || pathname.startsWith(`${path}/`)
}
