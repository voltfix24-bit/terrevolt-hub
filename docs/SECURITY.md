# Beheer-notitie: rollen, rechten en eerste admin

Dit intranet gebruikt een rollen- en rechtensysteem dat volledig wordt
afgedwongen via Supabase RLS. Frontend-gates (`PermissionGate`,
`AdminGate`, `AuthRequired`) zijn alleen UX — de bron van waarheid is de
database.

## Eerste admin instellen

Er is **geen frontend-flow** om jezelf admin te maken. Dit is opzettelijk:
het voorkomt privilege-escalatie.

De eerste admin moet handmatig in de Supabase database worden gezet door
een beheerder met service-role toegang (Lovable Cloud → backend):

```sql
-- Vervang het e-mailadres door de eerste admin
INSERT INTO public.user_roles (user_id, role, display_name, active)
SELECT u.id, 'admin', COALESCE(u.raw_user_meta_data->>'full_name', u.email), true
FROM auth.users u
WHERE u.email = 'eerste.admin@terrevolt.nl'
ON CONFLICT (user_id, role) DO UPDATE SET active = true;
```

Daarna kan deze admin via `/instellingen` overige gebruikers, rollen en
rechten beheren.

## Wat is afgedwongen in de database

- `user_roles` INSERT: alleen door admins of gebruikers met
  `manage_users`; **niemand** mag zichzelf een rol geven
  (`user_id <> auth.uid()`); alleen bestaande admins mogen de `admin`-rol
  toekennen.
- `user_roles` UPDATE/DELETE: zelfde regels — geen zelfbewerking.
- `user_permissions` INSERT/UPDATE/DELETE: alleen door admins of via
  `manage_users`.
- Alle wijzigingen op `user_roles` en `user_permissions` worden
  automatisch gelogd in `audit_logs` via database-triggers
  (`audit_role_change`, `audit_permission_change`), ook bij directe
  database-acties buiten de frontend om.

## Document- en linkzichtbaarheid

`kb_articles`, `sharepoint_items`, `applications`, `partner_links` en
`quick_links` hebben een `visibility` kolom (`doc_visibility`):

- `all_staff` (standaard) – alle actieve gebruikers
- `management` – admin + management
- `finance` – admin + management + finance + `view_finance` permissie
- `planning` – admin + management + planning + `view_planning` permissie
- `admin_only` – alleen admin

RLS gebruikt `public.can_view_doc(visibility)`. De Vraagbaak/zoekfunctie
filtert chunks via `public.can_view_chunk_source()` zodat snippets en
metadata uit niet-toegankelijke bronnen nooit zichtbaar zijn.
