import { usePreparedMember } from "@/hooks/use-preparation"
import type { Member } from "@/lib/preparation"

/** Le membre connecté prépare les pages (usePreparedMember) ; rien à afficher. */
export function MemberPreparation({ member }: { member: Member }) {
  usePreparedMember(member)
  return null
}
