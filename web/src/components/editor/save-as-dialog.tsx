import type { useSaveAsTemplate } from "@/components/editor/use-save-as-template"
import { TemplateDialog } from "@/components/templates/template-dialog"
import type { ContentKind } from "@/lib/contents/api"
import { isTemplateFor } from "@/lib/contents/templates"
import { texts } from "@/texts"

/** La fenêtre « Enregistrer comme modèle », pour les blocs choisis d'un brouillon. */
export function SaveAsDialog({
  saveAs,
  kind,
}: {
  saveAs: ReturnType<typeof useSaveAsTemplate>
  // La sorte du contenu : le point de départ proposé est de sa section.
  kind: ContentKind
}) {
  const { dialog } = saveAs
  return (
    <TemplateDialog
      open={dialog.open}
      onOpenChange={(open) => {
        if (!open) dialog.onClose()
      }}
      title={texts.templates.saveAs.title}
      description={texts.templates.saveAs.description(dialog.count)}
      submitLabel={texts.templates.saveAs.submit}
      defaultSection={isTemplateFor(kind) ? kind : null}
      sharedDisabled={
        dialog.count > 1 ? texts.templates.saveAs.sharedOne : null
      }
      pending={dialog.pending}
      error={dialog.error}
      onSubmit={dialog.submit}
    />
  )
}
