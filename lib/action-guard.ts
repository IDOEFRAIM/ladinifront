/**
 * ACTION GUARD — enveloppe de sécurité des Server Actions
 * ──────────────────────────────────────────────────────────────────────────
 * Ne contient PAS 'use server' : c'est un helper interne, jamais exposé au navigateur.
 *
 * Chaque Server Action (features/<domaine>/actions/*.ts) appelle `secureAction` qui :
 *   a) vérifie la session et le rôle système (getAccessContext → RBAC) ;
 *   b) valide les arguments avec Zod (avant tout accès au service) ;
 *   c) délègue au service pur ;
 *   d) renvoie TOUJOURS un `ApiResult<T>` (jamais d'exception, jamais de NextResponse).
 */
import { z } from 'zod';
import { getAccessContext, type SystemRole } from '@/lib/api-guard';
import type { AccessContext } from '@/lib/access-context';
import { ok, fail, errorMessage, type ApiResult } from '@/lib/api-result';

/** Rôles autorisés — mêmes valeurs que middleware.ts / getAccessContext. */
export const ADMIN_ROLES: readonly SystemRole[] = ['ADMIN', 'SUPERADMIN'];
export const PRODUCER_ROLES: readonly SystemRole[] = ['PRODUCER', 'ADMIN', 'SUPERADMIN'];

/**
 * Rôles d'organisation assimilés à « gestionnaire » — MÊME liste que `requireProducer` (lib/api-guard.ts),
 * conservée à l'identique pour ne pas modifier les droits existants.
 */
const ORG_MANAGER_ROLES = ['OWNER', 'ADMIN', 'MANAGER'];

/**
 * Règle producteur UNIFORME (produits, stocks, fermes) : admin plateforme, titulaire d'un profil producteur,
 * ou gestionnaire d'organisation. À utiliser via `access: 'producer'`.
 */
export function hasProducerAccess(ctx: AccessContext): boolean {
  return (
    ctx.isGlobalAdmin ||
    Boolean(ctx.producerId) ||
    ctx.orgScopes.some((scope) => ORG_MANAGER_ROLES.includes(scope.orgRole.toUpperCase()))
  );
}

type DataOf<R> = R extends { success: boolean }
  ? 'data' extends keyof R
    ? Exclude<R['data'], undefined | null>
    : never
  : R;

/** Type de la donnée utile d'un retour de service (`{ success, data }` ou valeur brute). */
export type Payload<R> = [DataOf<R>] extends [never] ? null : DataOf<R>;

interface GuardOptions {
  /** Rôles système autorisés. Absent = tout utilisateur authentifié. */
  roles?: readonly SystemRole[];
  /** Règle d'accès métier nommée (en plus, ou à la place, de `roles`). */
  access?: 'producer';
  /** Action volontairement publique (login, inscription) : aucune session exigée. */
  public?: boolean;
  /** Schéma Zod du tuple d'arguments. */
  schema: z.ZodType;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** Convertit le retour historique des services (`{success,data,error}` ou valeur brute) en ApiResult. */
function normalize(result: unknown): ApiResult<unknown> {
  if (isRecord(result) && typeof result.success === 'boolean') {
    if (result.success) return ok(result.data ?? null);
    return fail(typeof result.error === 'string' && result.error ? result.error : 'Opération refusée.');
  }
  return ok(result);
}

export async function secureAction<TArgs extends unknown[], R>(
  options: GuardOptions,
  args: [...TArgs],
  handler: (...args: TArgs) => Promise<R>
): Promise<ApiResult<Payload<R>>> {
  try {
    if (!options.public) {
      const { ctx, error } = await getAccessContext(
        options.roles ? [...options.roles] : undefined
      );
      if (error || !ctx) {
        return fail(error?.status === 403 ? 'Accès non autorisé.' : 'Authentification requise.');
      }
      if (options.access === 'producer' && !hasProducerAccess(ctx)) {
        return fail('Profil producteur requis.');
      }
    }

    const parsed = options.schema.safeParse(args);
    if (!parsed.success) {
      return fail(parsed.error.issues.map((i) => i.message).join(', ') || 'Données invalides.');
    }

    return normalize(await handler(...args)) as ApiResult<Payload<R>>;
  } catch (err) {
    console.error('[secureAction]', err);
    return fail(errorMessage(err, 'Erreur serveur.'));
  }
}

// ── Schémas Zod réutilisables ───────────────────────────────────────────────
export const idArg = z.string().min(1, 'Identifiant requis').max(100);
/** Objet JSON quelconque : la validation métier fine reste dans le service (schémas de lib/validators). */
export const objectArg = z.record(z.string(), z.unknown());
