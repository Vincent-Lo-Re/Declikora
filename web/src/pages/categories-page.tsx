import { useQuery, useQueryClient } from "@tanstack/react-query"
import { cn } from "cn"
import { ArrowLeft } from "lucide-react"
import { Link } from "react-router"

import { OrderedNames } from "@/components/ordered-names"
import { PageHeader } from "@/components/page-header"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  categoryKeys,
  createCategory,
  deleteCategory,
  listCategories,
  renameCategory,
  reorderCategories,
  type CategorySection,
} from "@/lib/categories"
import { contentKeys } from "@/lib/contents/api"
import { categoryNameSchema } from "@/lib/schemas"
import { sections } from "@/navigation"
import { texts } from "@/texts"

const labels = texts.categories

/**
 * Les catégories d'une section (Blog ou Podcasts) : ajouter, renommer, ranger dans l'ordre de
 * l'app (glisser-déposer à la souris ou au clavier), supprimer. La suppression est définitive
 * ([D28]) : la confirmation le dit, avec le nombre de brouillons qui la perdent.
 */
export function CategoriesPage({ section }: { section: CategorySection }) {
  const sectionTitle = texts.sections[section].title
  const queryClient = useQueryClient()
  const key = categoryKeys.list(section)
  // Relue à chaque ouverture : le nombre de brouillons de chaque catégorie change dans l'éditeur,
  // sans que cette liste le sache.
  const categories = useQuery({
    queryKey: key,
    queryFn: () => listCategories(section),
    staleTime: 0,
  })

  return (
    <>
      <div className="mb-2">
        <Link
          to={sections[section].path}
          aria-label={labels.back(sectionTitle)}
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "-ml-2"
          )}
        >
          <ArrowLeft />
          {sectionTitle}
        </Link>
      </div>
      <PageHeader
        title={labels.title(sectionTitle)}
        description={labels.description[section]}
      />
      <Card className="max-w-2xl">
        <CardContent className="space-y-6">
          <p className="text-sm text-muted-foreground">{labels.order}</p>
          <OrderedNames
            labels={{ ...labels, listLabel: labels.listLabel(sectionTitle) }}
            query={categories}
            queryKey={key}
            schema={categoryNameSchema}
            inputId="categorie"
            create={(name) => createCategory(section, name)}
            rename={renameCategory}
            remove={deleteCategory}
            reorder={(ids) => reorderCategories(section, ids)}
            // Les listes du Blog ou des Podcasts montrent les noms : relues aussi.
            refresh={() =>
              Promise.all([
                queryClient.invalidateQueries({ queryKey: categoryKeys.all }),
                queryClient.invalidateQueries({ queryKey: contentKeys.lists }),
              ])
            }
            after={(category) => (
              <span className="shrink-0 text-sm text-muted-foreground">
                {labels.uses(category.uses)}
              </span>
            )}
            // Le nombre de brouillons qui la perdent est relu avant de confirmer ([D28]).
            onAskRemove={() => void categories.refetch()}
            confirmBusy={categories.isFetching}
            confirmDetail={(category) =>
              labels.confirmRemove.uses(
                categories.data?.find((item) => item.id === category.id)
                  ?.uses ?? category.uses
              )
            }
          />
        </CardContent>
      </Card>
    </>
  )
}
