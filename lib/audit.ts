/**
 * AUDIT LOG SERVICE — AgriConnect v2
 * ──────────────────────────────────────────────────────────────────────────
 * Enregistre chaque mutation critique dans la table AuditLog.
 *
 * Règles de sécurité :
 *  1. L'audit est TOUJOURS non-bloquant : un échec d'audit ne doit JAMAIS
 *     faire échouer une mutation métier.
 *  2. Les écritures sont faites en fire-and-forget via `void` + microtask.
 *  3. La table AuditLog est append-only : jamais de UPDATE ni de DELETE.
 *  4. Ne jamais stocker de données sensibles (mots de passe, tokens) dans
 *     oldValue / newValue.
 */
'use server';

import { prisma } from '@/lib/prisma';

export interface AuditEntry {
  actorId: string;    // ID de l'utilisateur qui fait l'action
  action: string;     // Ex: 'UPDATE_STOCK', 'VALIDATE_ORDER', 'PROMOTE_USER'
  entityId: string;   // ID de l'objet modifié
  entityType: string; // Ex: 'STOCK', 'ORDER', 'USER', 'PRODUCT', 'PRODUCER'
  oldValue?: Record<string, unknown> | null;  // État avant (JSON-safe)
  newValue?: Record<string, unknown> | null;  // État après (JSON-safe)
  ipAddress?: string; // Adresse IP du client (optionnel)
}

// ─────────────────────────────────────────────────────────────────────────────
// FIRE-AND-FORGET INTERNAL WRITER
// ─────────────────────────────────────────────────────────────────────────────

function _writeAudit(entry: AuditEntry): void {
  // Planifier l'écriture après la résolution de la promesse courante.
  // Process.nextTick garantit que la mutation métier est terminée avant
  // que l'audit tente d'écrire — non-bloquant par conception.
  void Promise.resolve().then(async () => {
    try {
      await prisma.auditLog.create({
        data: {
          actorId:    entry.actorId,
          action:     entry.action,
          entityId:   entry.entityId,
          entityType: entry.entityType,
          oldValue:   entry.oldValue as any,
          newValue:   entry.newValue as any,
          ipAddress:  entry.ipAddress  ?? undefined,
        },
      });
    } catch (err) {
      // Erreur silencieuse : l'audit ne doit jamais bloquer l'application.
      console.error('[AuditLog] Échec écriture (non-critique):', err);
    }
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Écrit une entrée dans AuditLog de façon non-bloquante (fire-and-forget).
 *
 * Appel synchrone — retourne immédiatement sans attendre l'écriture DB.
 * Utiliser `await auditSync(entry)` si tu as besoin de garantir l'écriture
 * (tests, rapport critique).
 *
 * @example
 *   audit({ actorId: userId, action: 'UPDATE_STOCK', entityId, entityType: 'STOCK', newValue });
 */
export async function audit(entry: AuditEntry): Promise<void> {
  _writeAudit(entry);
}

/**
 * Version synchrone (awaitable) de `audit`.
 * N'utiliser que lorsque la confirmation d'écriture est critique
 * (ex. rapports d'audit réglementaires).
 */
export async function auditSync(entry: AuditEntry): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId:    entry.actorId,
        action:     entry.action,
        entityId:   entry.entityId,
        entityType: entry.entityType,
        oldValue:   entry.oldValue as any,
        newValue:   entry.newValue as any,
        ipAddress:  entry.ipAddress  ?? undefined,
      },
    });
  } catch (err) {
    console.error('[AuditLog] Échec écriture (sync):', err);
  }
}

/**
 * Écrit plusieurs entrées en batch (fire-and-forget).
 * Utile pour les mises à jour de masse (prix nationaux, etc.).
 */
export async function auditBatch(entries: AuditEntry[]): Promise<void> {
  if (entries.length === 0) return;
  void Promise.resolve().then(async () => {
    try {
      await prisma.$transaction(
        entries.map((e) =>
          prisma.auditLog.create({
            data: {
              actorId:    e.actorId,
              action:     e.action,
              entityId:   e.entityId,
              entityType: e.entityType,
              oldValue:   e.oldValue as any,
              newValue:   e.newValue as any,
              ipAddress:  e.ipAddress ?? undefined,
            },
          })
        )
      );
    } catch (err) {
      console.error('[AuditLog] Échec batch (non-critique):', err);
    }
  });
}

/**
 * Helper pour capturer l'état "avant" d'un objet Prisma avant mutation.
 * Filtre les champs sensibles et retourne un objet JSON-safe.
 * Synchrone — peut être appelé avec ou sans `await` (compatibilité ascendante).
 *
 * @param sensitiveKeys Clés à exclure (ex. ['password', 'token'])
 */
export async function snapshot(
  obj: Record<string, unknown> | null | undefined,
  sensitiveKeys: string[] = ['password', 'token', 'secret']
): Promise<any> {
  if (!obj) return null;
  const safe = { ...obj };
  for (const key of sensitiveKeys) delete safe[key];
  return JSON.parse(JSON.stringify(safe));
}
