import type { ReactNode } from "react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useBrandName } from "@/hooks/use-brand-name"
import { tabTitle } from "@/lib/admin-identity"

/** Cadre commun aux pages de connexion, avec le titre de l'onglet. */
export function AuthCard({
  title,
  description,
  children,
}: {
  title: string
  description?: ReactNode
  children: ReactNode
}) {
  const brand = useBrandName()
  return (
    <Card>
      <title>{tabTitle(title, brand)}</title>
      <CardHeader>
        <CardTitle>
          <h1>{title}</h1>
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}
