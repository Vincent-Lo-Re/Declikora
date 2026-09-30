import { useState, type FormEvent } from "react"

import {
  ContentSettingsFields,
  type SectionCategories,
} from "@/components/editor/content-settings-sheet"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Spinner } from "@/components/ui/spinner"
import type { AccessLevel } from "@/lib/access-levels"
import type { ContentSettings } from "@/lib/contents/api"
import type { SettingsChoices } from "@/lib/contents/settings"
import { texts } from "@/texts"

const labels = texts.contentList

/** Les sortes de contenu qui ont une liste (et donc cette fenêtre). */
export type ListKind = "page" | "article" | "episode" | "method"

// Un contenu neuf : pas encore de niveau d'accès ([D41]), ni d'adresse, ni de catégorie.
const emptyChoices: ContentSettings = {
  accessChosen: false,
  accessLevelId: null,
  slug: null,
  categoryIds: [],
  inApp: false,
  isFree: false,
}

const BLANK = "vide"

export type NewContent = {
  title: string
  // Le point de départ choisi ([D42]), null pour un contenu vide.
  starterId: string | null
  choices: SettingsChoices
}

/**
 * « Nouvel article », « Nouvel épisode », « Nouvelle méthode », « Nouvelle page » : le titre, un
 * point de départ s'il y en a, et les mêmes réglages que dans l'éditeur (niveau d'accès,
 * catégories, adresse). Tout se modifie ensuite dans les réglages.
 */
export function NewContentDialog({
  open,
  onOpenChange,
  kind,
  starters,
  categories,
  levels,
  levelsFailed,
  pending,
  error,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  kind: ListKind
  // Les points de départ de cette sorte (vide pour une méthode).
  starters: { id: string; title: string }[]
  categories?: SectionCategories
  levels: AccessLevel[] | undefined
  levelsFailed: boolean
  pending: boolean
  error: string | null
  onSubmit: (created: NewContent) => void
}) {
  const kindLabels = labels.kinds[kind]
  const [title, setTitle] = useState("")
  const [starter, setStarter] = useState(BLANK)
  const [settings, setSettings] = useState(emptyChoices)
  const [titleError, setTitleError] = useState<string | null>(null)

  // Chaque ouverture repart d'une fenêtre vide.
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setTitle("")
      setStarter(BLANK)
      setSettings(emptyChoices)
      setTitleError(null)
    }
  }

  const starterItems = [
    { value: BLANK, label: kindLabels.blank },
    ...starters.map((item) => ({
      value: item.id,
      label: item.title.trim() || texts.templates.list.untitled,
    })),
  ]

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const trimmed = title.trim()
    if (!trimmed) {
      setTitleError(texts.publication.settings.titleRequired)
      return
    }
    onSubmit({
      title: trimmed,
      starterId: starter === BLANK ? null : starter,
      choices: {
        accessChosen: settings.accessChosen,
        accessLevelId: settings.accessLevelId,
        slug: settings.slug,
        categoryIds: settings.categoryIds,
      },
    })
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <DialogContent className="max-h-dialog overflow-y-auto sm:max-w-lg">
        <form onSubmit={submit} noValidate className="grid gap-6">
          <DialogHeader>
            <DialogTitle>{kindLabels.create}</DialogTitle>
            <DialogDescription>
              {labels.newContent.description}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <ContentSettingsFields
              kind={kind}
              title={title}
              onTitleChange={(value) => {
                setTitle(value)
                setTitleError(null)
              }}
              titleError={titleError}
              settings={settings}
              editable={!pending}
              levels={levels}
              levelsFailed={levelsFailed}
              live={null}
              refusedSlug={null}
              categories={categories}
              onChange={setSettings}
              afterTitle={
                starters.length > 0 && (
                  <>
                    <Separator />
                    <Field>
                      <FieldLabel htmlFor="nouveau-depart">
                        {labels.newContent.starter}
                      </FieldLabel>
                      <Select
                        items={starterItems}
                        value={starter}
                        onValueChange={(value) => setStarter(value ?? BLANK)}
                      >
                        <SelectTrigger id="nouveau-depart" className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {starterItems.map((item) => (
                            <SelectItem key={item.value} value={item.value}>
                              {item.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FieldDescription>
                        {labels.newContent.starterHint}
                      </FieldDescription>
                    </Field>
                  </>
                )
              }
            />
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending && <Spinner />}
              {kindLabels.submit}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
