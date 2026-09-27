import { PageHeader } from "@/components/page-header"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { sections, type SectionKey } from "@/navigation"
import { texts } from "@/texts"

/** Page d'une section pas encore construite. */
export function SectionPage({ section }: { section: SectionKey }) {
  const { title, description } = texts.sections[section]
  const { icon: Icon } = sections[section]

  return (
    <>
      <PageHeader title={title} description={description} />
      <Empty className="border border-dashed">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Icon />
          </EmptyMedia>
          <EmptyTitle>{texts.comingSoon.title}</EmptyTitle>
          <EmptyDescription>{texts.comingSoon.description}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    </>
  )
}
