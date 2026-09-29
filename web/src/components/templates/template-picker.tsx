import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router"

import { excerpt, flattenBlocks } from "@/blocks/draft"
import { blockLabel } from "@/blocks/labels"
import { templateInsertable } from "@/blocks/templates"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import {
  listTemplates,
  templateKeys,
  type TemplateItem,
} from "@/lib/contents/templates"
import { sections } from "@/navigation"
import { texts } from "@/texts"

const labels = texts.templates.insert

// Les sortes qui s'insèrent dans un contenu (un point de départ sert à en créer un).
const insertableSorts = ["style", "shared"] as const

/** Ce que contient un modèle, en quelques mots (les noms de ses blocs). */
function summary(template: TemplateItem): string {
  return excerpt(
    flattenBlocks(template.draft)
      .map(({ block }) => blockLabel(block))
      .join(", "),
    80
  )
}

/**
 * « Ajouter un bloc » › « Un modèle… » : les mises en forme (insérées en copie) et les blocs
 * identiques partout (insérés liés). Un bloc identique partout vide ne s'insère pas ([D11]).
 */
export function TemplatePicker({
  open,
  onOpenChange,
  onChoose,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onChoose: (template: TemplateItem) => void
}) {
  const templates = useQuery({
    queryKey: templateKeys.list,
    queryFn: listTemplates,
    enabled: open,
  })
  const available = (templates.data ?? []).filter(
    (template) => templateInsertable(template) !== "starter"
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{labels.title}</DialogTitle>
          <DialogDescription>{labels.description}</DialogDescription>
        </DialogHeader>
        {templates.data === undefined ? (
          templates.isError ? (
            <div className="space-y-2">
              <p role="alert" className="text-sm text-destructive">
                {labels.loadFailed}
              </p>
              <Button variant="outline" onClick={() => templates.refetch()}>
                {labels.retry}
              </Button>
            </div>
          ) : (
            <div className="space-y-2" aria-label={texts.common.loading}>
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          )
        ) : available.length === 0 ? (
          <p className="text-sm text-muted-foreground">{labels.empty}</p>
        ) : (
          <div className="max-h-picker space-y-5 overflow-y-auto">
            {insertableSorts.map((sort) => {
              const items = available.filter((item) => item.sort === sort)
              if (items.length === 0) return null
              const headingId = `inserer-${sort}`
              return (
                <section key={sort} aria-labelledby={headingId}>
                  <h3 id={headingId} className="mb-2 text-sm font-semibold">
                    {texts.templates.sorts[sort].title}
                  </h3>
                  <ul className="space-y-1.5">
                    {items.map((template) => {
                      const name =
                        template.title.trim() || texts.templates.list.untitled
                      const empty = templateInsertable(template) === "empty"
                      return (
                        <li
                          key={template.id}
                          className="flex items-center gap-3 rounded-lg border p-2.5"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">
                              {name}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {empty ? labels.emptyTemplate : summary(template)}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={empty}
                            aria-label={labels.insertLabel(name)}
                            onClick={() => onChoose(template)}
                          >
                            {labels.insert}
                          </Button>
                        </li>
                      )
                    })}
                  </ul>
                </section>
              )
            })}
          </div>
        )}
        <div className="flex justify-end">
          <Link
            to={sections.templates.path}
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            {labels.manage}
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  )
}
