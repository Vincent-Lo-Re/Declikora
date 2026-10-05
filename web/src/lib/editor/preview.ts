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

// À l'ouverture de l'éditeur depuis une liste : l'iPhone, en Édition, en clair, comme un abonné.
export const defaultPreview: PreviewSettings = {
  device: "ios",
  mode: "edit",
  theme: "light",
  largeText: false,
  reader: "subscriber",
  fit: "adjust",
}

// Les réglages gardés dans l'adresse de l'éditeur, d'un écran à l'autre (QCM du 04/10/2026) :
// seulement ceux qui diffèrent de defaultPreview, en mots français comme les adresses de
// navigation.ts (« ?mode=lecture&telephone=android&theme=sombre »).
type ChoiceKey = Exclude<keyof PreviewSettings, "largeText">
const searchWords: {
  [K in ChoiceKey]: { name: string; values: Record<PreviewSettings[K], string> }
} = {
  mode: { name: "mode", values: { edit: "edition", read: "lecture" } },
  device: { name: "telephone", values: { ios: "iphone", android: "android" } },
  theme: { name: "theme", values: { light: "clair", dark: "sombre" } },
  reader: {
    name: "lecteur",
    values: { subscriber: "abonne", visitor: "sans-formule" },
  },
  fit: { name: "ecran", values: { adjust: "ajuste", full: "entier" } },
}
const choiceKeys = Object.keys(searchWords) as ChoiceKey[]
const largeTextWord = { name: "texte", value: "grand" }

/** Les réglages du téléphone lus dans l'adresse ; un mot inconnu vaut le réglage de départ. */
export function previewFromSearch(
  search: string | URLSearchParams
): PreviewSettings {
  const params = new URLSearchParams(search)
  const pick = <K extends ChoiceKey>(key: K): PreviewSettings[K] => {
    const { name, values } = searchWords[key]
    const word = params.get(name)
    const keys = Object.keys(values) as PreviewSettings[K][]
    return keys.find((value) => values[value] === word) ?? defaultPreview[key]
  }
  return {
    device: pick("device"),
    mode: pick("mode"),
    theme: pick("theme"),
    largeText: params.get(largeTextWord.name) === largeTextWord.value,
    reader: pick("reader"),
    fit: pick("fit"),
  }
}

/**
 * L'adresse avec ces réglages du téléphone, les autres paramètres gardés ; seuls les réglages
 * qui diffèrent de defaultPreview y sont écrits.
 */
export function withPreview(
  search: string | URLSearchParams,
  preview: PreviewSettings
): URLSearchParams {
  const params = new URLSearchParams(search)
  const word = <K extends ChoiceKey>(key: K): string | null =>
    preview[key] === defaultPreview[key]
      ? null
      : searchWords[key].values[preview[key]]
  for (const key of choiceKeys) {
    const value = word(key)
    if (value === null) params.delete(searchWords[key].name)
    else params.set(searchWords[key].name, value)
  }
  if (preview.largeText) params.set(largeTextWord.name, largeTextWord.value)
  else params.delete(largeTextWord.name)
  return params
}

/**
 * Une adresse de l'éditeur qui garde les réglages du téléphone de l'adresse affichée : passer de
 * la méthode à une leçon reste en Lecture, sur le même téléphone.
 */
export function keepPreview(path: string, search: string): string {
  const kept = withPreview("", previewFromSearch(search)).toString()
  return kept ? `${path}?${kept}` : path
}

// La hauteur du téléphone entier : --blocks-screen-height et deux fois --blocks-device-padding
// de preview.css (.blocks-preview-layout[data-device]) ; les changer des deux côtés.
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
