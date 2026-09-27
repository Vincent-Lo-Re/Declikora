import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { texts } from "@/texts"

/**
 * Affichée quand une page plante. L'erreur est déjà signalée à Sentry
 * (onCaughtError, dans lib/sentry.ts).
 */
export function ErrorPage() {
  return (
    <div className="p-8">
      <PageHeader
        title={texts.error.title}
        description={texts.error.description}
      />
      <Button variant="outline" onClick={() => window.location.reload()}>
        {texts.error.reload}
      </Button>
    </div>
  )
}
