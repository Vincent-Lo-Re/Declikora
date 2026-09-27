import { Link } from "react-router"

import { PageHeader } from "@/components/page-header"
import { buttonVariants } from "@/components/ui/button"
import { sections } from "@/navigation"
import { texts } from "@/texts"

export function NotFoundPage() {
  return (
    <>
      <PageHeader
        title={texts.notFound.title}
        description={texts.notFound.description}
      />
      <Link
        to={sections.home.path}
        className={buttonVariants({ variant: "outline" })}
      >
        {texts.notFound.back}
      </Link>
    </>
  )
}
