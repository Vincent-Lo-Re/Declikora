import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Plus } from "lucide-react"
import { useState, type ReactNode } from "react"

import { singleLine } from "@/blocks/components/fields"
import { TITLE_MAX } from "@/blocks/draft"
import { AccessLevelChoice } from "@/components/editor/access-level-choice"
import { SlugField } from "@/components/editor/slug-field"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { liveLevelName, type AccessLevel } from "@/lib/access-levels"
import {
  categoryKeys,
  createCategory,
  type Category,
  type CategorySection,
} from "@/lib/categories"
import type { ContentKind, ContentSettings } from "@/lib/contents/api"
import type { LiveVersion } from "@/lib/contents/publication"
import type { RefusedSlug } from "@/lib/contents/slug"
import { errorMessage } from "@/lib/errors"
import { categoryNameSchema } from "@/lib/schemas"
import { texts } from "@/texts"

const labels = texts.publication.settings

/** Les catégories de la section d'un article ou d'un épisode, telles que l'éditeur les lit. */
export type SectionCategories = {
  section: CategorySection
  // undefined tant qu'elles ne sont pas lues.
  list: Category[] | undefined
  failed: boolean
  retry: () => void
}

/**
 * « Réglages du contenu » : le niveau d'accès (obligatoire avant la publication, [D41]), pour
 * une page son adresse, pour un article ou un épisode ses catégories (facultatives, [D44]). Ils
 * partent avec le brouillon (save_draft, sous le verrou) et ne changent l'app qu'à la prochaine
 * publication.
 */
export function ContentSettingsSheet({
  open,
  onOpenChange,
  footer,
  notice,
  ...fields
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  // Depuis une liste : « Enregistrer » et « Annuler » (dans l'éditeur, tout part tout seul).
  footer?: ReactNode
  // À la place de « Lecture seule… » : pourquoi on ne peut pas modifier (quelqu'un écrit ce
  // contenu), ou ce qui se vérifie encore.
  notice?: string
} & SettingsFieldsProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-md">
        <SheetHeader className="pr-12">
          <SheetTitle>{labels.title}</SheetTitle>
          <SheetDescription>{labels.description}</SheetDescription>
        </SheetHeader>
        <div className="space-y-6 px-4 pb-6">
          {notice ? (
            <p role="status" className="text-sm text-muted-foreground">
              {notice}
            </p>
          ) : (
            !fields.editable && (
              <p className="text-sm text-muted-foreground">{labels.readOnly}</p>
            )
          )}
          <ContentSettingsFields {...fields} />
        </div>
        {footer && <SheetFooter>{footer}</SheetFooter>}
      </SheetContent>
    </Sheet>
  )
}

type SettingsFieldsProps = {
  kind: ContentKind
  // Le contenu réglé (null à la création) : une adresse déjà prise par une AUTRE page est refusée.
  contentId?: string | null
  // Faux dans la fenêtre de création : l'adresse d'une page y vient du titre.
  slugField?: boolean
  title: string
  // Le titre comme champ (fenêtre de création, réglages) : sinon, il ne sert qu'à proposer
  // l'adresse d'une page.
  onTitleChange?: (title: string) => void
  titleError?: string | null
  // Fenêtre de création : le curseur est dans le titre dès l'ouverture, sans niveau d'accès
  // (il se choisit ensuite dans les réglages) ni lien vers la page des catégories.
  creating?: boolean
  // Sous le titre (fenêtre de création : le point de départ).
  afterTitle?: ReactNode
  settings: ContentSettings
  editable: boolean
  levels: AccessLevel[] | undefined
  levelsFailed: boolean
  live: LiveVersion | null
  // La dernière adresse refusée par l'enregistrement (prise ou invalide).
  refusedSlug: RefusedSlug | null
  // Article ou épisode : les catégories de sa section.
  categories?: SectionCategories
  onChange: (next: ContentSettings) => void
}

/**
 * Les réglages d'un contenu (titre, niveau d'accès, catégories, adresse) : dans la glissière
 * « Réglages » et dans la fenêtre de création.
 */
export function ContentSettingsFields({
  kind,
  contentId = null,
  slugField = true,
  title,
  onTitleChange,
  titleError = null,
  creating = false,
  afterTitle,
  settings,
  editable,
  levels,
  levelsFailed,
  live,
  refusedSlug,
  categories,
  onChange,
}: SettingsFieldsProps) {
  return (
    <>
      {onTitleChange && (
        <Field data-invalid={titleError !== null}>
          <FieldLabel htmlFor="reglages-titre">{labels.titleLabel}</FieldLabel>
          <Input
            id="reglages-titre"
            autoFocus={creating}
            value={title}
            readOnly={!editable}
            maxLength={TITLE_MAX}
            autoComplete="off"
            placeholder={texts.editor.title.placeholder}
            aria-invalid={titleError !== null}
            onChange={(event) =>
              onTitleChange(singleLine(event.target.value).slice(0, TITLE_MAX))
            }
          />
          <FieldError>{titleError}</FieldError>
        </Field>
      )}
      {afterTitle}
      {!creating && (
        <>
          {onTitleChange && <Separator />}
          <AccessSection
            settings={settings}
            editable={editable}
            levels={levels}
            levelsFailed={levelsFailed}
            live={live}
            onChange={(accessLevelId) =>
              onChange({ ...settings, accessChosen: true, accessLevelId })
            }
          />
        </>
      )}
      {categories && (
        <>
          <Separator />
          <CategoriesSection
            categories={categories}
            chosen={settings.categoryIds}
            editable={editable}
            onChange={(categoryIds) => onChange({ ...settings, categoryIds })}
          />
        </>
      )}
      {kind === "page" && slugField && (
        <>
          <Separator />
          <SlugField
            id="reglages-adresse"
            contentId={contentId}
            slug={settings.slug}
            title={title}
            editable={editable}
            live={live}
            refused={refusedSlug}
            onCommit={(slug) => onChange({ ...settings, slug })}
          />
        </>
      )}
    </>
  )
}

/**
 * Les catégories du contenu (cases à cocher, dans l'ordre de la section). Une catégorie
 * supprimée entre-temps n'est plus montrée, et elle part de la liste envoyée au prochain
 * changement ([D28]).
 */
function CategoriesSection({
  categories,
  chosen,
  editable,
  onChange,
}: {
  categories: SectionCategories
  chosen: string[]
  editable: boolean
  onChange: (categoryIds: string[]) => void
}) {
  const words = labels.categories
  const list = categories.list
  const toggle = (id: string, checked: boolean) => {
    if (!list) return
    const known = new Set(list.map((category) => category.id))
    const next = new Set(chosen.filter((other) => known.has(other)))
    if (checked) next.add(id)
    else next.delete(id)
    onChange([...next].sort())
  }
  return (
    <section className="space-y-3">
      <div className="space-y-1">
        <h3 id="reglages-categories" className="text-sm font-medium">
          {words.label}
        </h3>
        <p className="text-sm text-muted-foreground">{words.description}</p>
      </div>
      {list === undefined ? (
        categories.failed ? (
          <div className="flex flex-wrap items-center gap-2">
            <p role="alert" className="text-sm text-destructive">
              {words.loadFailed}
            </p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={categories.retry}
            >
              {texts.common.retry}
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-5 w-32" />
          </div>
        )
      ) : list.length === 0 ? (
        <p className="text-sm text-muted-foreground">{words.none}</p>
      ) : (
        <ul
          aria-labelledby="reglages-categories"
          className="grid gap-2"
          data-category-choice
        >
          {list.map((category) => (
            <li key={category.id}>
              <Label className="font-normal">
                <Checkbox
                  checked={chosen.includes(category.id)}
                  disabled={!editable}
                  onCheckedChange={(checked) => toggle(category.id, checked)}
                />
                {category.name}
              </Label>
            </li>
          ))}
        </ul>
      )}
      {editable && list !== undefined && (
        <AddCategory
          section={categories.section}
          onAdded={(category) => onChange([...chosen, category.id].sort())}
        />
      )}
    </section>
  )
}

/**
 * Une nouvelle catégorie, créée tout de suite dans la section (comme depuis la page Catégories),
 * puis cochée. Entrée l'ajoute sans envoyer le formulaire autour (fenêtre de création).
 */
export function AddCategory({
  section,
  onAdded,
  autoFocus = false,
}: {
  section: CategorySection
  onAdded: (category: Category) => void
  // Ouvert par « Nouvelle » (éditeur du Fil) : le curseur va dans le champ.
  autoFocus?: boolean
}) {
  const queryClient = useQueryClient()
  const [name, setName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const add = useMutation({
    mutationFn: (value: string) => createCategory(section, value),
    onSuccess: (category) => {
      queryClient.setQueryData<Category[]>(
        categoryKeys.list(section),
        (list) => [...(list ?? []), category]
      )
      void queryClient.invalidateQueries({ queryKey: categoryKeys.all })
      setName("")
      onAdded(category)
    },
    onError: (failure) => setError(errorMessage(failure)),
  })
  const submit = () => {
    const parsed = categoryNameSchema.safeParse({ name })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? null)
      return
    }
    add.mutate(parsed.data.name)
  }
  return (
    <Field data-invalid={error !== null}>
      <FieldLabel htmlFor="reglages-nouvelle-categorie">
        {texts.categories.newName}
      </FieldLabel>
      <div className="flex gap-2">
        <Input
          id="reglages-nouvelle-categorie"
          autoFocus={autoFocus}
          value={name}
          autoComplete="off"
          placeholder={texts.categories.namePlaceholder}
          aria-invalid={error !== null}
          onChange={(event) => {
            setName(event.target.value)
            setError(null)
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault()
              submit()
            }
          }}
        />
        <Button
          type="button"
          variant="outline"
          disabled={add.isPending}
          onClick={submit}
        >
          {add.isPending ? <Spinner /> : <Plus />}
          {texts.categories.add}
        </Button>
      </div>
      <FieldError>{error}</FieldError>
    </Field>
  )
}

function AccessSection({
  settings,
  editable,
  levels,
  levelsFailed,
  live,
  onChange,
}: {
  settings: ContentSettings
  editable: boolean
  levels: AccessLevel[] | undefined
  levelsFailed: boolean
  live: LiveVersion | null
  onChange: (levelId: string | null) => void
}) {
  const liveLevel = live ? liveLevelName(live.access_level_id, levels) : null
  return (
    <section className="space-y-3">
      <div className="space-y-1">
        <h3 id="reglages-niveau" className="text-sm font-medium">
          {labels.access.label}
        </h3>
        <p className="text-sm text-muted-foreground">
          {labels.access.description}
        </p>
      </div>
      {levels === undefined ? (
        levelsFailed ? (
          <p role="alert" className="text-sm text-destructive">
            {labels.access.loadFailed}
          </p>
        ) : (
          <div className="space-y-2">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        )
      ) : (
        <>
          <AccessLevelChoice
            idPrefix="reglages-niveau"
            labelledBy="reglages-niveau"
            chosen={settings.accessChosen}
            levelId={settings.accessLevelId}
            levels={levels}
            disabled={!editable}
            onChange={onChange}
          />
          {!settings.accessChosen && (
            <p className="text-sm text-warning">{labels.access.notChosen}</p>
          )}
          {levels.length === 0 && (
            <p className="text-sm text-muted-foreground">
              {labels.access.noLevels}
            </p>
          )}
        </>
      )}
      {liveLevel && (
        <p className="text-sm text-muted-foreground">
          {labels.access.live(liveLevel)}
        </p>
      )}
    </section>
  )
}
