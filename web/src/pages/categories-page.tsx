import { useQuery, useQueryClient } from "@tanstack/react-query"
import { cn } from "cn"
import { ArrowLeft, Link as LinkIcon, Tags, Unlink } from "lucide-react"
import { Link } from "react-router"

import { IconBadge } from "@/components/icon-badge"
import { OrderedNames } from "@/components/ordered-names"
import { PageHeader } from "@/components/page-header"
import { buttonVariants } from "@/components/ui/button"
import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  categoryKeys,
  createCategory,
  deleteCategory,
  renameCategory,
  reorderCategories,
  type CategorySection,
} from "@/lib/categories"
import { contentKeys } from "@/lib/contents/api"
import { categoriesRead, REREAD_MS } from "@/lib/reads"
import { categoryNameSchema } from "@/lib/schemas"
import { RETURN_STATE, returnAddress } from "@/lib/scroll-memory"
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
    ...categoriesRead(section),
    // La préparation de la page vient de la relire.
    staleTime: REREAD_MS,
  })

  return (
    <>
      <div className="mb-2">
        <Link
          to={returnAddress(sections[section].path)}
          state={RETURN_STATE}
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
        icon={Tags}
        title={labels.title(sectionTitle)}
        description={labels.description[section]}
      />
      <OrderedNames
        labels={{ ...labels, listLabel: labels.listLabel(sectionTitle) }}
        header={
          <CardHeader>
            <CardTitle>{labels.orderTitle}</CardTitle>
            <CardDescription>{labels.order}</CardDescription>
          </CardHeader>
        }
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
        // Comme les fichiers de la Médiathèque : un lien si des brouillons la citent.
        after={(category) => (
          <IconBadge
            icon={category.uses > 0 ? LinkIcon : Unlink}
            label={labels.uses(category.uses)}
          />
        )}
        // Le nombre de brouillons qui la perdent est relu avant de confirmer ([D28]).
        onAskRemove={() => void categories.refetch()}
        confirmBusy={categories.isFetching}
        confirmDetail={(category) =>
          labels.confirmRemove.uses(
            categories.data?.find((item) => item.id === category.id)?.uses ??
              category.uses
          )
        }
      />
    </>
  )
}
