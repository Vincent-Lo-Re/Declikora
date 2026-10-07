import { useQuery } from "@tanstack/react-query"

import { BrandFileSlot } from "@/components/settings/brand-file-slot"
import { Card, CardContent } from "@/components/ui/card"
import { variantPresets, type BrandKind } from "@/lib/admin-identity"
import { adminBrandRead } from "@/lib/reads"
import { texts } from "@/texts"

const labels = texts.settings.adminIdentity.files

/**
 * Les logos (Paramètres, section « Logos ») : une carte, le logotype puis le monogramme, chacun
 * avec ses deux cases (fond clair, fond sombre) ; côte à côte sur une carte assez large, l'un sous
 * l'autre sinon. Un logo décliné pour les palettes le dit sous son titre.
 */
export function BrandLogosCard() {
  const variants = useQuery(adminBrandRead()).data?.variants ?? {}
  const varied = (kind: BrandKind) =>
    Object.keys(variants).some((key) => key.startsWith(`${kind}:`))

  return (
    <Card className="@container">
      <CardContent className="grid gap-6 @md:grid-cols-2">
        {(["logotype", "monogram"] as const).map((kind) => (
          <div key={kind} className="space-y-2">
            <div className="text-sm">
              <span className="font-medium">{labels[kind].title}</span>
              <span className="text-muted-foreground">
                {" "}
                · {labels[kind].use}
              </span>
              {varied(kind) && (
                <div className="text-xs text-muted-foreground">
                  {labels.variants.status(variantPresets.length)}
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <BrandFileSlot kind={kind} surface="light" />
              <BrandFileSlot kind={kind} surface="dark" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
