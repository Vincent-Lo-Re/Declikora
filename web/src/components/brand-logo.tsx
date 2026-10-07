import { cn } from "cn"

import { usePalette } from "@/components/theme/palette-context"
import { useBrand, useBrandName } from "@/hooks/use-brand-name"
import { brandFileFor } from "@/lib/admin-identity"
import { presetOf } from "@/lib/palettes"

/**
 * La marque dessinée (ADMIN § 7, « Le nom de la marque ») : le logotype ou le monogramme pour le
 * fond où il est posé (« theme » : celui du thème, clair ou sombre), décliné aux couleurs de la
 * palette de ce membre s'il l'a été, sinon le nom en texte. Son nom reste lu par les lecteurs
 * d'écran (alt).
 */
export function BrandLogo({
  kind,
  surface,
  className,
}: {
  kind: "logotype" | "monogram"
  surface: "light" | "dark" | "theme"
  // La hauteur de l'image (h-…) ; le texte garde la taille de son parent.
  className: string
}) {
  const brand = useBrand()
  const name = useBrandName()
  // La déclinaison de la palette choisie par ce membre, s'il y en a une.
  const preset = presetOf(usePalette().palette)
  const light = brandFileFor(brand, kind, "light", preset)
  const dark = brandFileFor(brand, kind, "dark", preset)
  if (!light) return <>{name}</>
  const image = (src: string, extra?: string) => (
    <img
      src={src}
      alt={name}
      className={cn("w-auto max-w-full object-contain", className, extra)}
    />
  )
  if (surface === "light") return image(light)
  if (surface === "dark") return image(dark ?? light)
  return (
    <>
      {image(light, "dark:hidden")}
      {image(dark ?? light, "hidden dark:block")}
    </>
  )
}
