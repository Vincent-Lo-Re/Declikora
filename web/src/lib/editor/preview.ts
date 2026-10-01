/**
 * L'aperçu de l'éditeur du Fil (docs/ADMINISTRATION.md, § 4) : le téléphone montré, Édition ou
 * Lecture, Clair ou Sombre, Grand texte, et en Lecture, le lecteur imité. Sans React.
 */

export const devices = ["ios", "android"] as const
type Device = (typeof devices)[number]

export const previewModes = ["edit", "read"] as const
type PreviewMode = (typeof previewModes)[number]

export const previewThemes = ["light", "dark"] as const
type PreviewTheme = (typeof previewThemes)[number]

// Un abonné à la bonne formule, ou une personne sans elle.
export const previewReaders = ["subscriber", "visitor"] as const
type PreviewReader = (typeof previewReaders)[number]

export type PreviewSettings = {
  device: Device
  mode: PreviewMode
  theme: PreviewTheme
  largeText: boolean
  reader: PreviewReader
}

// À chaque ouverture de l'éditeur : l'iPhone, en Édition, en clair, comme un abonné.
export const defaultPreview: PreviewSettings = {
  device: "ios",
  mode: "edit",
  theme: "light",
  largeText: false,
  reader: "subscriber",
}

/**
 * La valeur choisie dans un groupe de boutons (`ToggleGroup` rend une liste) : `null` quand on
 * reclique sur le bouton déjà choisi, qui reste alors choisi.
 */
export function chosenValue<T extends string>(
  values: readonly T[],
  value: readonly string[]
): T | null {
  return values.find((candidate) => candidate === value[0]) ?? null
}

/**
 * En Lecture, comme une personne sans la formule : l'article réservé ne montre pas ses blocs.
 * C'est ce que l'app reçoit (`app_content` : `locked`, sans `blocks`). Un article dont le
 * niveau n'est pas encore choisi se lit en entier.
 */
export function previewLocked(
  preview: PreviewSettings,
  access: { accessChosen: boolean; accessLevelId: string | null }
): boolean {
  return (
    preview.mode === "read" &&
    preview.reader === "visitor" &&
    access.accessChosen &&
    access.accessLevelId !== null
  )
}
