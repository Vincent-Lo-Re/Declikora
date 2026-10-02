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

// En Lecture : l'écran à la hauteur de la fenêtre (à sa vraie largeur), ou l'écran entier, réduit.
export const previewFits = ["adjust", "full"] as const
type PreviewFit = (typeof previewFits)[number]

export type PreviewSettings = {
  device: Device
  mode: PreviewMode
  theme: PreviewTheme
  largeText: boolean
  reader: PreviewReader
  fit: PreviewFit
}

// À chaque ouverture de l'éditeur : l'iPhone, en Édition, en clair, comme un abonné.
export const defaultPreview: PreviewSettings = {
  device: "ios",
  mode: "edit",
  theme: "light",
  largeText: false,
  reader: "subscriber",
  fit: "adjust",
}

// La hauteur du téléphone entier (écran et cadre), comme .blocks-device dans preview.css.
const deviceHeights: Record<Device, number> = {
  ios: 874 + 2 * 10,
  android: 915 + 2 * 9,
}

// En dessous, le texte ne se lirait plus : l'écran déborde plutôt que de rapetisser encore.
const MIN_SCALE = 0.4

/**
 * « Écran entier » : seulement en Lecture (en Édition, réduire l'écran fausserait le
 * glisser-déposer et le curseur, docs/ADMINISTRATION.md, § 4).
 */
export function showsFullScreen(preview: PreviewSettings): boolean {
  return preview.mode === "read" && preview.fit === "full"
}

/**
 * La réduction de l'écran entier pour tenir dans la hauteur disponible : 1 si la place suffit,
 * arrondie au centième inférieur, jamais sous 0,4.
 */
export function fullScreenScale(device: Device, available: number): number {
  const scale = Math.floor((available / deviceHeights[device]) * 100) / 100
  return Math.min(1, Math.max(MIN_SCALE, scale))
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
