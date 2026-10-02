import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { isMostComplete, type AccessLevel } from "@/lib/access-levels"
import { texts } from "@/texts"

const labels = texts.publication.settings.access

// Valeur de « Gratuit » dans le groupe (une formule a pour valeur son identifiant).
const FREE = "gratuit"

/**
 * Le niveau d'accès d'un contenu : « Gratuit » ou une formule, sans choix par défaut ([D41]).
 * Tant que rien n'est choisi, aucune case n'est cochée.
 */
export function AccessLevelChoice({
  idPrefix,
  chosen,
  levelId,
  levels,
  disabled = false,
  onChange,
  labelledBy,
}: {
  idPrefix: string
  chosen: boolean
  levelId: string | null
  levels: AccessLevel[]
  disabled?: boolean
  onChange: (levelId: string | null) => void
  labelledBy?: string
}) {
  const value = chosen ? (levelId ?? FREE) : ""
  const options = [
    { value: FREE, title: labels.free, hint: labels.freeHint },
    ...levels.map((level) => ({
      value: level.id,
      title: level.name,
      hint: isMostComplete(levels, level.id)
        ? labels.levelHintTop
        : labels.levelHint,
    })),
  ]
  return (
    <RadioGroup
      value={value}
      disabled={disabled}
      aria-labelledby={labelledBy}
      onValueChange={(next: string) => onChange(next === FREE ? null : next)}
    >
      {options.map((option) => {
        const id = `${idPrefix}-${option.value}`
        return (
          <FieldLabel key={option.value} htmlFor={id}>
            <Field orientation="horizontal" data-disabled={disabled}>
              <RadioGroupItem value={option.value} id={id} />
              <FieldContent>
                <FieldTitle>{option.title}</FieldTitle>
                <FieldDescription>{option.hint}</FieldDescription>
              </FieldContent>
            </Field>
          </FieldLabel>
        )
      })}
    </RadioGroup>
  )
}
