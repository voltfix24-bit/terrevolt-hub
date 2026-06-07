## Doel
Maak het intranet alleen toegankelijk voor ingelogde medewerkers, met fijnmazige rollen + module-rechten en RLS die niet te omzeilen is vanuit de frontend.

## 1. Rollen en rechten (database)
**Migratie 1 — rolwijziging**
- Bestaande `app_role` enum: `admin, management, kantoor, monteur, zzper`.
- Toevoegen: `finance`, `planning`. `zzper` blijft bestaan (Postgres staat geen verwijderen uit enum toe zonder data-migratie); wordt niet gebruikt in UI.
- Eindset: `admin, management, finance, planning, kantoor, monteur` (+ legacy `zzper`).

**Migratie 2 — permissies**
- Nieuw enum `app_permission`: `view_finance, view_planning, manage_users, manage_knowledge, manage_documents, manage_news, view_sensitive_people_data, manage_settings`.
- Nieuwe tabel `public.user_permissions(user_id, permission, granted_by, created_at)` met unique (user_id, permission).
- Helper-functies (SECURITY DEFINER, search_path=public):
  - `has_permission(_user uuid, _perm app_permission)` → true als admin OF rij in user_permissions.
  - `can_view_finance()` = admin/management of `view_finance`.
  - `can_view_planning()` = admin/management/planning of `view_planning`.
  - `can_view_sensitive_people()` = admin/management of `view_sensitive_people_data`.
  - `can_manage(perm)` = admin of permission.
- RLS op `user_permissions`: alleen admin schrijft; gebruiker leest eigen rijen.

## 2. RLS aanscherpen
Per tabel policies herschrijven zodat **anon nooit leest** en authenticated alleen onder voorwaarden:

| Tabel | Lezen | Schrijven |
|---|---|---|
| kb_articles, kb_sections, kb_categories, kb_chunks, kb_versions | alle ingelogden | `can_manage('manage_knowledge')` |
| news | alle ingelogden | `can_manage('manage_news')` |
| people | alle ingelogden (basis) | admin/management |
| people_sensitive | `can_view_sensitive_people()` | admin/management |
| finance_clients | `can_view_finance()` | admin/management/finance |
| applications, departments, partner_links, quick_links, sharepoint_items, sharepoint_config | alle ingelogden | admin |
| documenten/storage `kb-documents` bucket | alle ingelogden | `can_manage('manage_documents')` |
| user_roles, user_permissions | eigen rij + admin alles | admin |
| reindex_queue, search_misses, vraagbaak_* | bestaand admin/staff-pattern blijft |

Alle policies expliciet `TO authenticated` (geen `TO public`/`anon`).

## 3. Auth-gate voor alle routes
- Nieuwe `src/routes/_authenticated/route.tsx` (`ssr: false`) die naar `/auth` redirect zonder sessie, met `redirect`-search-param.
- Alle bestaande route-bestanden hernoemen naar `_authenticated.*.tsx` zodat ze onder de gate vallen. `auth.tsx` en `__root.tsx` blijven publiek.
- `/auth` leest na login `search.redirect` en navigeert terug.

## 4. Frontend rechten-laag
- `src/lib/auth.tsx` uitbreiden met `useCurrentPermissions()` en helper `usePerms()` die teruggeeft: `{ role, perms, canViewFinance, canViewPlanning, canViewSensitive, canManage(perm), isAdmin }`.
- Data-fetches in alle pagina's pas starten als sessie+rol+perms geladen zijn (`enabled` flag in React Query).
- `Sidebar` filtert menu-items op basis van perms (Finance, Instellingen, etc. verbergen waar geen toegang).
- Nieuwe `<PermissionGate permission|role>` component die nette "Geen toegang"-pagina toont (i.p.v. AdminGate alleen voor admin).
- Bestaande `AdminGate` blijft voor `/instellingen` (admin only). Finance- en planning-routes krijgen eigen gate.

## 5. Gebruikersbeheerpagina
- In `/instellingen` (admin) bestaande "Gebruikers"-sectie uitbreiden:
  - Lijst van alle user_roles met naam, e-mail, rol, actief/inactief toggle, en checkboxes voor extra permissies (view_finance, view_planning, manage_knowledge, manage_news, manage_documents, view_sensitive_people_data, manage_users, manage_settings).
  - "actief"-veld toevoegen aan `user_roles` (kolom `active boolean default true`). Inactieve users worden in gates geweigerd (`has_role` + `is_active` check).
  - Wijzigingen via server-fn `updateUserAccess` met admin-check.

## 6. Veiligheid
- Geen frontend-only checks: elke gevoelige tabel/bucket heeft RLS.
- Nieuwe gebruiker krijgt standaard rol `kantoor`, geen extra perms.
- Trigger op `auth.users` (al aanwezig?) blijft basisrol toekennen.

## Technische details
- **Migraties** (3 stuks): rol-enum uitbreiden, permission-enum + tabel + functies + `active`-kolom, RLS-policies herschrijven.
- **Routebestanden** worden hernoemd via `git mv`-achtige `mv` commands; URLs blijven hetzelfde (underscore-prefix telt niet mee in path).
- **Server-fns** voor user management: `listUsers`, `setUserRole`, `setUserActive`, `setUserPermission`.
- **Geen breaking changes** voor bestaande data; bestaande admin-flows blijven werken.

## Wat ik nodig heb van jou
1. Bevestig dat `zzper` mag blijven als legacy (niet zichtbaar in UI). Anders moeten we eerst alle `zzper`-rollen migreren.
2. Akkoord dat alle bestaande URLs hetzelfde blijven (alleen bestandsnamen wijzigen).
3. Akkoord op standaardrol `kantoor` voor nieuwe gebruikers zonder extra perms.

Na akkoord voer ik dit uit in 4 batches: (1) migraties, (2) auth-gate + route-rename, (3) frontend perms + sidebar filtering, (4) gebruikersbeheer-UI.