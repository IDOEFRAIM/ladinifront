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
import { classifyDbError } from '@/lib/db-errors';

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
  /**
   * Action sensible (paiement, suppression, changement de rôle, validation financière, accès tenant critique) :
   * le contexte d'accès est relu en base à chaque appel — jamais depuis le cache. Implicite pour les actions ADMIN.
   */
  sensitive?: boolean;
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
        options.roles ? [...options.roles] : undefined,
        undefined,
        options.sensitive ? { fresh: true } : {}
      );
      if (error || !ctx) {
        // Fail closed : 503 (DB indisponible) ≠ 401 (non authentifié) ≠ 403 (refusé) — messages distincts.
        if (error?.status === 403) return fail('Accès non autorisé.');
        if (error?.status === 503) return fail('Service momentanément indisponible, réessayez dans quelques secondes.');
        return fail('Authentification requise.');
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
    const info = classifyDbError(err);
    console.error('[secureAction]', info.errorClass, info.code);
    // Jamais de SQL, de paramètres ou d'URL vers le client : les erreurs DB reçoivent un message générique.
    if (info.transient) return fail('Service momentanément indisponible, réessayez dans quelques secondes.');
    if (info.errorClass === 'conflict') return fail('Conflit : la donnée a été modifiée. Rechargez puis recommencez.');
    const message = errorMessage(err, 'Erreur serveur.');
    if (/^Failed query/i.test(message)) return fail('Erreur serveur.');
    return fail(message);
  }
}

// ── Schémas Zod réutilisables ───────────────────────────────────────────────
export const idArg = z.string().min(1, 'Identifiant requis').max(100);
/** Objet JSON quelconque : la validation métier fine reste dans le service (schémas de lib/validators). */
export const objectArg = z.record(z.string(), z.unknown());
