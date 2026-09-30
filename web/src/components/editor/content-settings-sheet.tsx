import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Plus, Tags } from "lucide-react"
import { useRef, useState, type KeyboardEvent, type ReactNode } from "react"
import { Link } from "react-router"

import { singleLine } from "@/blocks/components/fields"
import { TITLE_MAX } from "@/blocks/draft"
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
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import type { AccessLevel } from "@/lib/access-levels"
import {
  categoryKeys,
  createCategory,
  type Category,
  type CategorySection,
} from "@/lib/categories"
import {
  findPageBySlug,
  type ContentKind,
  type ContentSettings,
} from "@/lib/contents/api"
import type { LiveVersion } from "@/lib/contents/publication"
import { checkSlug, slugFromTitle } from "@/lib/contents/slug"
import { errorMessage } from "@/lib/errors"
import { categoryNameSchema } from "@/lib/schemas"
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
  footer,
  notice,
  ...fields
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  // Le champ à mettre en avant à l'ouverture (adresse manquante ou déjà prise, catégories).
  focus: SettingsFocus
  // Depuis une liste : « Enregistrer » et « Annuler » (dans l'éditeur, tout part tout seul).
  footer?: ReactNode
  // À la place de « Lecture seule… » : pourquoi on ne peut pas modifier (quelqu'un écrit ce
  // contenu), ou ce qui se vérifie encore.
  notice?: string
} & Omit<SettingsFieldsProps, "slugRef" | "categoriesRef" | "highlightSlug">) {
  const slugRef = useRef<HTMLInputElement>(null)
  const categoriesRef = useRef<HTMLHeadingElement>(null)
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className="w-full gap-0 overflow-y-auto sm:max-w-md"
        initialFocus={
          focus === "slug"
            ? slugRef
            : focus === "categories" && fields.categories
              ? categoriesRef
              : undefined
        }
      >
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
          <ContentSettingsFields
            {...fields}
            slugRef={slugRef}
            categoriesRef={categoriesRef}
            highlightSlug={focus === "slug"}
          />
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
  // Fenêtre de création : le curseur est dans le titre dès l'ouverture.
  autoFocusTitle?: boolean
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
  slugRef?: React.RefObject<HTMLInputElement | null>
  categoriesRef?: React.RefObject<HTMLHeadingElement | null>
  highlightSlug?: boolean
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
  autoFocusTitle = false,
  afterTitle,
  settings,
  editable,
  levels,
  levelsFailed,
  live,
  refusedSlug,
  categories,
  onChange,
  slugRef,
  categoriesRef,
  highlightSlug = false,
}: SettingsFieldsProps) {
  const ownSlugRef = useRef<HTMLInputElement>(null)
  const ownCategoriesRef = useRef<HTMLHeadingElement>(null)
  return (
    <>
      {onTitleChange && (
        <Field data-invalid={titleError !== null}>
          <FieldLabel htmlFor="reglages-titre">{labels.titleLabel}</FieldLabel>
          <Input
            id="reglages-titre"
            autoFocus={autoFocusTitle}
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
      {kind === "chapter" || kind === "lesson" ? (
        <ElementSection
          kind={kind}
          settings={settings}
          editable={editable}
          onChange={onChange}
        />
      ) : (
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
            headingRef={categoriesRef ?? ownCategoriesRef}
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
            contentId={contentId}
            inputRef={slugRef ?? ownSlugRef}
            slug={settings.slug}
            title={title}
            editable={editable}
            live={live}
            highlight={highlightSlug}
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
      {editable && list !== undefined && (
        <AddCategory
          section={categories.section}
          onAdded={(category) => onChange([...chosen, category.id].sort())}
        />
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

/**
 * Une nouvelle catégorie, créée tout de suite dans la section (comme depuis la page Catégories),
 * puis cochée. Entrée l'ajoute sans envoyer le formulaire autour (fenêtre de création).
 */
function AddCategory({
  section,
  onAdded,
}: {
  section: CategorySection
  onAdded: (category: Category) => void
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
        {texts.categories.name}
      </FieldLabel>
      <div className="flex gap-2">
        <Input
          id="reglages-nouvelle-categorie"
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

/**
 * Chapitre ou leçon : « Montrer dans l'app » et « Leçon gratuite » ([D29], [D43]). Pas de niveau
 * d'accès : c'est celui de la méthode.
 */
function ElementSection({
  kind,
  settings,
  editable,
  onChange,
}: {
  kind: "chapter" | "lesson"
  settings: ContentSettings
  editable: boolean
  onChange: (next: ContentSettings) => void
}) {
  const words = labels.element
  return (
    <section className="space-y-3" data-element-settings>
      <div className="space-y-1">
        <h3 className="text-sm font-medium">{words.label}</h3>
        <p className="text-sm text-muted-foreground">{words.description}</p>
      </div>
      <Field orientation="horizontal">
        <Checkbox
          id="reglages-dans-app"
          checked={settings.inApp}
          disabled={!editable}
          onCheckedChange={(inApp) => onChange({ ...settings, inApp })}
        />
        <div className="space-y-1">
          <FieldLabel htmlFor="reglages-dans-app">{words.inApp}</FieldLabel>
          <FieldDescription>
            {words.inAppHint}
            {kind === "chapter" && ` ${words.chapterInAppHint}`}
          </FieldDescription>
        </div>
      </Field>
      {kind === "lesson" && (
        <Field orientation="horizontal">
          <Checkbox
            id="reglages-gratuite"
            checked={settings.isFree}
            disabled={!editable}
            onCheckedChange={(isFree) => onChange({ ...settings, isFree })}
          />
          <div className="space-y-1">
            <FieldLabel htmlFor="reglages-gratuite">{words.isFree}</FieldLabel>
            <FieldDescription>{words.isFreeHint}</FieldDescription>
          </div>
        </Field>
      )}
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

function SlugField({
  contentId,
  inputRef,
  slug,
  title,
  editable,
  live,
  highlight,
  refused,
  onCommit,
}: {
  contentId: string | null
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
  const [checking, setChecking] = useState(false)
  // L'adresse a changé ailleurs (relecture du brouillon) ou vient d'être refusée : le champ
  // reprend celle du brouillon, ou garde celle qui a été refusée.
  const [shown, setShown] = useState({ slug, refused })
  if (shown.slug !== slug || shown.refused !== refused) {
    setShown({ slug, refused })
    setText(refused ? (refused.slug ?? "") : (slug ?? ""))
    setError(null)
  }

  const commit = async (value: string) => {
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
    if (checked.slug === slug) return
    // Déjà prise par une autre page : refusée tout de suite (la base refuse aussi, à
    // l'enregistrement, si une autre page la prend entre-temps).
    if (checked.slug) {
      setChecking(true)
      try {
        const other = await findPageBySlug(checked.slug, contentId)
        if (other) {
          setError(labels.slug.taken(other.title))
          return
        }
      } catch {
        // Vérification impossible (réseau) : la base tranchera à l'enregistrement.
      } finally {
        setChecking(false)
      }
    }
    onCommit(checked.slug)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault()
      void commit(event.currentTarget.value)
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
            void commit(event.target.value)
          }}
          onKeyDown={onKeyDown}
        />
        <FieldDescription id="reglages-adresse-aide">
          {checking ? labels.slug.checking : labels.slug.description}
        </FieldDescription>
        <FieldError>{message}</FieldError>
      </Field>
      <div className="flex flex-wrap items-center justify-between gap-2">
        {editable && suggestion && suggestion !== slug ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => void commit(suggestion)}
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
