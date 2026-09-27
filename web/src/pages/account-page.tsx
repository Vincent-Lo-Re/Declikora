import { PageHeader } from "@/components/page-header"
import { ThemeChoice } from "@/components/theme-choice"
import { texts } from "@/texts"

export function AccountPage() {
  const { title, description } = texts.sections.account

  return (
    <>
      <PageHeader title={title} description={description} />
      <section className="max-w-xl space-y-3">
        <div className="space-y-1">
          <h2 className="font-medium">{texts.theme.title}</h2>
          <p className="text-sm text-muted-foreground">
            {texts.theme.description}
          </p>
        </div>
        <ThemeChoice />
      </section>
    </>
  )
}
