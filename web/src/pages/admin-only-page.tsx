import { Link } from "react-router"

import { PageHeader } from "@/components/page-header"
import { buttonVariants } from "@/components/ui/button"
import { sections } from "@/navigation"
import { texts } from "@/texts"

/** Affichée à un éditeur qui ouvre une section réservée aux admins. */
export function AdminOnlyPage() {
  return (
    <>
      <PageHeader
        title={texts.adminOnly.title}
        description={texts.adminOnly.description}
      />
      <Link
        to={sections.home.path}
        className={buttonVariants({ variant: "outline" })}
      >
        {texts.adminOnly.back}
      </Link>
    </>
  )
}
