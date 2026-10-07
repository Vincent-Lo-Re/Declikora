import { useBrand } from "@/hooks/use-brand-name"

/**
 * Une phrase d'aide de la connexion : avec l'adresse de contact de la marque (Paramètres), son
 * début puis l'adresse en lien ; sans adresse, la phrase d'origine.
 */
export function ContactText({
  plain,
  withContact,
}: {
  plain: string
  withContact: string
}) {
  const email = useBrand()?.contactEmail
  if (!email) return <>{plain}</>
  return (
    <>
      {withContact}{" "}
      <a href={`mailto:${email}`} className="underline underline-offset-4">
        {email}
      </a>
      .
    </>
  )
}
