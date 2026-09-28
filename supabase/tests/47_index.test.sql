begin;
\ir aides/roles.inc

select plan(2);

-- La clé étrangère de la version en ligne a un index qui couvre ses deux colonnes, dans l'ordre.
select has_index(
  'public', 'contents', 'contents_live_version_fk_idx', array['live_version_id', 'id'],
  'contents : index de la clé vers la version en ligne (live_version_id, id)'
);

-- L'ancien index, qui ne couvrait que live_version_id, n'existe plus.
select hasnt_index(
  'public', 'contents', 'contents_live_version_idx',
  'contents : l''ancien index sur live_version_id seul est retiré'
);

select * from finish();
rollback;
