import { Link } from "react-router"

import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from "@/components/ui/item"
import type { TemplateUse } from "@/lib/contents/templates"
import { contentEditorPath } from "@/navigation"
import { texts } from "@/texts"

/** Les brouillons qui utilisent un modèle, avec un lien vers leur éditeur. */
export function UsesList({
  uses,
  title = texts.templates.list.used.list,
}: {
  uses: TemplateUse[]
  title?: string
}) {
  return (
    <div className="space-y-1">
      <p className="text-sm font-medium">{title}</p>
      <ItemGroup className="max-h-48 overflow-y-auto">
        {uses.map((use) => {
          const name = use.title.trim() || texts.common.untitled
          const path = use.inTrash ? null : contentEditorPath(use.kind, use.id)
          return (
            <Item
              key={use.id}
              role="listitem"
              size="xs"
              data-template-use={use.id}
            >
              <ItemContent className="min-w-0">
                <ItemTitle className="block w-full truncate font-normal">
                  {path ? (
                    <Link to={path} className="hover:underline">
                      {name}
                    </Link>
                  ) : (
                    name
                  )}
                </ItemTitle>
                <ItemDescription>
                  {texts.trash.contentKinds[use.kind]}
                  {use.inTrash && `, ${texts.templates.list.used.inTrash}`}
                </ItemDescription>
              </ItemContent>
            </Item>
          )
        })}
      </ItemGroup>
    </div>
  )
}
