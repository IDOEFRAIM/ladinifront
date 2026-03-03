# Impact Mapping — Refactoring Multi-tenant RBAC & Audit

> **Date :** Session actuelle  
> **Objectif :** Transformer le prototype FrontAg en plateforme multi-tenant, auditable, avec RBAC dynamique par permissions.

---

## Fichiers créés

| Fichier | Type | Directive | Description |
|---|---|---|---|
| `lib/permissions.ts` | Nouveau | **(B) RBAC dynamique** | Constantes de permissions, helpers `hasPermission()`, `hasAllPermissions()`, `hasAnyPermission()`, filtres de scope `orgScopeFilter()`, `zoneScopeFilter()` |
| `lib/audit.ts` | Nouveau | **(C) Audit logging** | Service d'audit : `audit()`, `auditBatch()`, `snapshot()`. Toute erreur d'audit est silencieuse (ne casse jamais la mutation métier) |
| `hooks/useCan.ts` | Nouveau | **(B) RBAC dynamique** | Hook client-side : `useCan()`, `useCanAll()`, `useCanAny()`, `usePermissions()`, `useActiveOrg()`. Lit le cookie `user-permissions` |
| `vitest.config.ts` | Nouveau | **Robustesse** | Configuration Vitest pour tests unitaires avec jsdom |
| `__tests__/permissions.test.ts` | Nouveau | **Robustesse** | 29 tests : hasPermission, hasAllPermissions, hasAnyPermission, orgScopeFilter, zoneScopeFilter, PERMISSIONS constant |
| `__tests__/audit.test.ts` | Nouveau | **Robustesse** | 7 tests : snapshot() — null, undefined, deep-clone, Date sérialisation, nested, undefined-strip, numeric/boolean |
| `__tests__/middleware.test.ts` | Nouveau | **Robustesse** | 13 tests : accès non-auth, ADMIN bypass, PRODUCER permissions, permissions manquantes, redirect déjà connecté |

## Fichiers modifiés

| Fichier | Changement | Directive | Détail |
|---|---|---|---|
| `lib/api-guard.ts` | Réécrit | **(A)(B)** | `AuthenticatedUser` inclut `organizations[]` et `permissions[]`. Charge les memberships org via Prisma join. Support `requiredRoles` (legacy) ET `requiredPermissions`. ADMIN bypass. |
| `lib/prisma.ts` | Simplifié | **Optimisation** | Suppression du fallback adapter complexe. Singleton `PrismaClient` propre avec log conditional. |
| `services/auth.service.ts` | Refactoré | **(A)(B)(C)** | `loadUserContext()` charge les orgs et compile les permissions. `setSessionCookies()` écrit `user-permissions` et `user-org`. Audit : `USER_REGISTER`, `USER_LOGIN`. `logoutUser()` nettoie les cookies RBAC. |
| `services/orders.service.ts` | Refactoré | **(A)(C)** | `CreateOrderParams` accepte `organizationId`. Audit : `CREATE_ORDER`. `select` précis au lieu de `include` large. |
| `services/inventory.service.ts` | Refactoré | **(C)** | Audit : `CREATE_STOCK`, `DELETE_STOCK`, `STOCK_MOVEMENT` (oldQuantity → newQuantity). Fix optional chaining `stock.farm?.producer.userId`. |
| `services/producer.service.ts` | Refactoré | **(C)** | Audit : `DELETE_PRODUCT`, `TOGGLE_PRODUCT_AVAILABILITY` (oldValue/newValue). |
| `services/admin.service.ts` | Refactoré | **(C)** | Audit : `UPDATE_PRODUCER_STATUS` (capture ancien statut), `ASSIGN_PRODUCER_ZONE` (capture ancienne zone). |
| `services/territory.service.ts` | Refactoré | **(C)** | Audit sur 7 mutations : `CREATE_CLIMATIC_REGION`, `UPDATE_CLIMATIC_REGION`, `DELETE_CLIMATIC_REGION`, `CREATE_ZONE`, `UPDATE_ZONE`, `TOGGLE_ZONE_ACTIVE`, `DELETE_ZONE`. |
| `middleware.ts` | Réécrit | **(B)** | RBAC hybride : tables `ROUTE_PERMISSIONS` et `ROUTE_ROLES`. Lecture du cookie `user-permissions`. ADMIN bypass permission check. Garde les security headers. |
| `hooks/useAuth.tsx` | Refactoré | **(A)(B)** | `AuthContextType` expose `permissions[]` et `activeOrg`. `checkSession()` parse les cookies RBAC. `saveSession()` hydrate les permissions. `logout()` nettoie `user-permissions` et `user-org`. |
| `package.json` | Mis à jour | **Robustesse** | Ajout scripts `test` et `test:watch`. Ajout devDependencies Vitest, Testing Library, jsdom. |

## Résumé des directives

| Directive | Couverture |
|---|---|
| **(A) Isolation par org/zone** | `orgScopeFilter()`, `zoneScopeFilter()` dans permissions.ts ; `organizationId` dans orders ; org memberships dans api-guard et auth |
| **(B) Permissions dynamiques** | `PERMISSIONS` constants, `hasPermission()` server-side, `useCan()` client-side, `middleware.ts` route-level RBAC, `user-permissions` cookie |
| **(C) Audit logging** | `audit()` / `auditBatch()` — 15 actions auditées : login, register, CRUD stock, CRUD produit, CRUD territoire, admin mutations |
| **Tests** | 49 tests unitaires passants (permissions, audit, middleware) |

## Actions auditées (15 types)

| Action | Service | Entité |
|---|---|---|
| `USER_REGISTER` | auth.service | User |
| `USER_LOGIN` | auth.service | User |
| `CREATE_ORDER` | orders.service | Order |
| `CREATE_STOCK` | inventory.service | Stock |
| `DELETE_STOCK` | inventory.service | Stock |
| `STOCK_MOVEMENT` | inventory.service | Stock |
| `DELETE_PRODUCT` | producer.service | Product |
| `TOGGLE_PRODUCT_AVAILABILITY` | producer.service | Product |
| `UPDATE_PRODUCER_STATUS` | admin.service | Producer |
| `ASSIGN_PRODUCER_ZONE` | admin.service | Producer |
| `CREATE_CLIMATIC_REGION` | territory.service | ClimaticRegion |
| `UPDATE_CLIMATIC_REGION` | territory.service | ClimaticRegion |
| `DELETE_CLIMATIC_REGION` | territory.service | ClimaticRegion |
| `CREATE_ZONE` | territory.service | Zone |
| `UPDATE_ZONE` | territory.service | Zone |
| `TOGGLE_ZONE_ACTIVE` | territory.service | Zone |
| `DELETE_ZONE` | territory.service | Zone |
