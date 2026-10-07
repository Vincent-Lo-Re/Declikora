/**
 * Une fiche de l'aide de l'admin (la base de connaissance, ADMIN § 7) : cherchée depuis le header
 * (⌘K), lue dans une glissière à droite. Une fiche par fichier, dans `help/fiches/`.
 */
export type HelpTheme =
  | "contenus"
  | "publication"
  | "mediatheque"
  | "modeles"
  | "corbeille"
  | "equipe"

export type HelpFiche = {
  // Son nom dans le code (et son fichier) : « programmer-une-publication ».
  slug: string
  theme: HelpTheme
  // Ce qu'on veut faire, en mots courants : « Programmer une publication ».
  title: string
  // Une phrase qui dit de quoi parle la fiche.
  summary: string
  // D'autres mots qu'on peut taper pour la trouver (« planifier », « date »…).
  keywords: string[]
  // Les étapes, dans l'ordre (affichées numérotées).
  steps?: string[]
  // Ce qu'il faut savoir en plus.
  notes?: string[]
}
