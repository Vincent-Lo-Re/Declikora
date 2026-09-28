import { Tags } from "lucide-react"
import { useRef, useState, type KeyboardEvent } from "react"
import { Link } from "react-router"

import { AccessLevelChoice } from "@/components/editor/access-level-choice"
import { Button, buttonVariants } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import type { AccessLevel } from "@/lib/access-levels"
import type { Category, CategorySection } from "@/lib/categories"
import type { ContentKind, ContentSettings } from "@/lib/contents/api"
import type { LiveVersion } from "@/lib/contents/publication"
import { checkSlug, slugFromTitle } from "@/lib/contents/slug"
import { categoriesPath } from "@/navigation"
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

/** Le champ à mettre en avant à l'ouverture des réglages. */
export type SettingsFocus = "slug" | "categories" | null

/**
 * Une adresse refusée par la base (prise ou invalide) : le brouillon garde son adresse
 * enregistrée, et le champ montre celle qui a été refusée, avec la raison.
 */
export type RefusedSlug = { slug: string | null; message: string }

/**
 * « Réglages du contenu » : le niveau d'accès (obligatoire avant la publication, [D41]), pour
 * une page son adresse, pour un article ou un épisode ses catégories (facultatives, [D44]). Ils
 * partent avec le brouillon (save_draft, sous le verrou) et ne changent l'app qu'à la prochaine
 * publication.
 */
export function ContentSettingsSheet({
  open,
  onOpenChange,
  focus,
  kind,
  title,
  settings,
  editable,
  levels,
  levelsFailed,
  live,
  refusedSlug,
  categories,
  onChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  // Le champ à mettre en avant à l'ouverture (adresse manquante ou déjà prise, catégories).
  focus: SettingsFocus
  kind: ContentKind
  title: string
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
}) {
  const slugRef = useRef<HTMLInputElement>(null)
  const categoriesRef = useRef<HTMLHeadingElement>(null)
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className="w-full gap-0 overflow-y-auto sm:max-w-md"
        initialFocus={
          focus === "slug"
            ? slugRef
            : focus === "categories"
              ? categoriesRef
              : undefined
        }
      >
        <SheetHeader className="pr-12">
          <SheetTitle>{labels.title}</SheetTitle>
          <SheetDescription>{labels.description}</SheetDescription>
        </SheetHeader>
        <div className="space-y-6 px-4 pb-6">
          {!editable && (
            <p className="text-sm text-muted-foreground">{labels.readOnly}</p>
          )}
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
          {categories && (
            <>
              <Separator />
              <CategoriesSection
                headingRef={categoriesRef}
                categories={categories}
                chosen={settings.categoryIds}
                editable={editable}
                onChange={(categoryIds) =>
                  onChange({ ...settings, categoryIds })
                }
              />
            </>
          )}
          {kind === "page" && (
            <>
              <Separator />
              <SlugField
                inputRef={slugRef}
                slug={settings.slug}
                title={title}
                editable={editable}
                live={live}
                highlight={focus === "slug"}
                refused={refusedSlug}
                onCommit={(slug) => onChange({ ...settings, slug })}
              />
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

/**
 * Les catégories du contenu (cases à cocher, dans l'ordre de la section). Une catégorie
 * supprimée entre-temps n'est plus montrée, et elle part de la liste envoyée au prochain
 * changement ([D28]).
 */
function CategoriesSection({
  headingRef,
  categories,
  chosen,
  editable,
  onChange,
}: {
  headingRef: React.RefObject<HTMLHeadingElement | null>
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
    <section className="space-y-3" data-settings="categories">
      <div className="space-y-1">
        <h3
          ref={headingRef}
          id="reglages-categories"
          tabIndex={-1}
          className="text-sm font-medium outline-none"
        >
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
              {words.retry}
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
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={chosen.includes(category.id)}
                  disabled={!editable}
                  onCheckedChange={(checked) => toggle(category.id, checked)}
                />
                {category.name}
              </label>
            </li>
          ))}
        </ul>
      )}
      <Link
        to={categoriesPath(categories.section)}
        className={buttonVariants({ variant: "outline", size: "sm" })}
      >
        <Tags />
        {words.manage}
      </Link>
    </section>
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
  const liveLevel = live
    ? live.access_level_id === null
      ? labels.access.free
      : (levels?.find((level) => level.id === live.access_level_id)?.name ??
        labels.access.deleted)
    : null
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
            <p className="text-sm text-amber-700 dark:text-amber-400">
              {labels.access.notChosen}
            </p>
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

function SlugField({
  inputRef,
  slug,
  title,
  editable,
  live,
  highlight,
  refused,
  onCommit,
}: {
  inputRef: React.RefObject<HTMLInputElement | null>
  slug: string | null
  title: string
  editable: boolean
  live: LiveVersion | null
  highlight: boolean
  refused: RefusedSlug | null
  onCommit: (slug: string | null) => void
}) {
  const [text, setText] = useState(
    refused ? (refused.slug ?? "") : (slug ?? "")
  )
  const [error, setError] = useState<string | null>(null)
  // L'adresse a changé ailleurs (relecture du brouillon) ou vient d'être refusée : le champ
  // reprend celle du brouillon, ou garde celle qui a été refusée.
  const [shown, setShown] = useState({ slug, refused })
  if (shown.slug !== slug || shown.refused !== refused) {
    setShown({ slug, refused })
    setText(refused ? (refused.slug ?? "") : (slug ?? ""))
    setError(null)
  }

  const commit = (value: string) => {
    const checked = checkSlug(value)
    if (!checked.ok) {
      setError(
        checked.reason === "too_long"
          ? labels.slug.tooLong
          : labels.slug.invalid
      )
      return
    }
    setError(null)
    setText(checked.slug ?? "")
    if (checked.slug !== slug) onCommit(checked.slug)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault()
      commit(event.currentTarget.value)
    }
  }

  const serverError = refused?.message ?? null
  const missing = highlight && !slug && !error && !serverError
  const message = error ?? serverError ?? (missing ? labels.slug.missing : null)
  const suggestion = slugFromTitle(title)

  return (
    <div className="space-y-3">
      <Field data-invalid={message !== null}>
        <FieldLabel htmlFor="reglages-adresse">{labels.slug.label}</FieldLabel>
        <Input
          ref={inputRef}
          id="reglages-adresse"
          value={text}
          readOnly={!editable}
          autoComplete="off"
          spellCheck={false}
          placeholder={labels.slug.placeholder}
          aria-invalid={message !== null}
          aria-describedby="reglages-adresse-aide"
          onChange={(event) => {
            setText(event.target.value)
            setError(null)
          }}
          onBlur={(event) => {
            // Quitter le champ sans rien changer ne renvoie pas une adresse déjà refusée.
            if (
              !editable ||
              (refused && event.target.value === (refused.slug ?? ""))
            )
              return
            commit(event.target.value)
          }}
          onKeyDown={onKeyDown}
        />
        <FieldDescription id="reglages-adresse-aide">
          {labels.slug.description}
        </FieldDescription>
        <FieldError>{message}</FieldError>
      </Field>
      <div className="flex flex-wrap items-center justify-between gap-2">
        {editable && suggestion && suggestion !== slug ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => commit(suggestion)}
          >
            {labels.slug.fromTitle}
          </Button>
        ) : (
          <span />
        )}
        {live?.slug && (
          <span className="text-sm text-muted-foreground">
            {labels.slug.live(live.slug)}
          </span>
        )}
      </div>
    </div>
  )
}
