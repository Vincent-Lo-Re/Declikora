import { Link } from "react-router"

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
      <ul className="max-h-48 space-y-1 overflow-y-auto text-sm">
        {uses.map((use) => {
          const name = use.title.trim() || texts.contentList.untitled
          const path = use.inTrash ? null : contentEditorPath(use.kind, use.id)
          return (
            <li key={use.id} data-template-use={use.id}>
              {path ? (
                <Link to={path} className="underline-offset-4 hover:underline">
                  {name}
                </Link>
              ) : (
                name
              )}
              <span className="text-muted-foreground">
                {" "}
                ({texts.trash.contentKinds[use.kind]}
                {use.inTrash && `, ${texts.templates.list.used.inTrash}`})
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
