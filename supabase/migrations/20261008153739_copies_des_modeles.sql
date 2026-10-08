-- Les copies des modèles de bloc (08/10/2026, ADMIN § 5) : une mise en forme insérée dans un
-- contenu, ou un point de départ dont un contenu est créé, est COPIÉE ; le contenu ne garde aucun
-- lien avec le modèle. Pour savoir où un modèle a servi (colonne « État » et onglet « Non
-- utilisés » des Modèles de bloc), l'admin note chaque copie ici, à partir de maintenant. Un bloc
-- partagé, lui, reste lié (draft_template_ids) : il n'est pas noté ici.
--
-- Une ligne par modèle et par contenu (la première copie compte) ; elle part quand le modèle ou
-- le contenu est supprimé définitivement. L'équipe la lit et l'écrit ; personne ne la change.

create table public.template_copies (
  template_id uuid not null references public.contents (id) on delete cascade,
  content_id uuid not null references public.contents (id) on delete cascade,
  copied_at timestamptz not null default now(),
  primary key (template_id, content_id),
  check (template_id <> content_id)
);

comment on table public.template_copies is
  'Où une mise en forme ou un point de départ a été copié (une ligne par modèle et par contenu, '
  'notée par l''admin à chaque copie) : l''utilisation des modèles copiés, inconnue autrement.';

create index template_copies_content_idx on public.template_copies (content_id);

alter table public.template_copies enable row level security;
revoke all on public.template_copies from anon, authenticated;
grant select, insert (template_id, content_id) on public.template_copies to authenticated;

create policy "Copies des modèles : lecture par l'équipe"
  on public.template_copies
  for select
  to authenticated
  using ((select public.is_staff()));

-- Seulement une mise en forme ou un point de départ (pas un bloc partagé, ni un autre contenu),
-- copié dans un contenu qui existe.
create policy "Copies des modèles : notées par l'équipe"
  on public.template_copies
  for insert
  to authenticated
  with check (
    (select public.is_staff())
    and exists (
      select 1 from public.contents t
      where t.id = template_id
        and t.kind = 'template'
        and t.template_sort in ('style', 'starter')
    )
    and exists (select 1 from public.contents c where c.id = content_id)
  );
