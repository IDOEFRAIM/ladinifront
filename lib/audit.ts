/**
 * AUDIT LOG SERVICE — AgriConnect v3 (Drizzle)
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

import { db, schema } from '@/src/db';

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
  void Promise.resolve().then(async () => {
    try {
      await db.insert(schema.auditLogs).values({
        actorId: entry.actorId,
        action: entry.action,
        entityId: entry.entityId,
        entityType: entry.entityType,
        oldValue: entry.oldValue ?? null,
        newValue: entry.newValue ?? null,
        ipAddress: entry.ipAddress ?? null,
      });
    } catch (err) {
      console.error('[AuditLog] Échec écriture (non-critique):', err);
    }
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────────────────────────────────────

export async function audit(entry: AuditEntry): Promise<void> {
  _writeAudit(entry);
}

export async function auditSync(entry: AuditEntry): Promise<void> {
  try {
    await db.insert(schema.auditLogs).values({
      actorId: entry.actorId,
      action: entry.action,
      entityId: entry.entityId,
      entityType: entry.entityType,
      oldValue: entry.oldValue ?? null,
      newValue: entry.newValue ?? null,
      ipAddress: entry.ipAddress ?? null,
    });
  } catch (err) {
    console.error('[AuditLog] Échec écriture (sync):', err);
  }
}

export async function auditBatch(entries: AuditEntry[]): Promise<void> {
  if (entries.length === 0) return;
  void Promise.resolve().then(async () => {
    try {
      await db.insert(schema.auditLogs).values(
        entries.map((e) => ({
          actorId: e.actorId,
          action: e.action,
          entityId: e.entityId,
          entityType: e.entityType,
          oldValue: e.oldValue ?? null,
          newValue: e.newValue ?? null,
          ipAddress: e.ipAddress ?? null,
        }))
      );
    } catch (err) {
      console.error('[AuditLog] Échec batch (non-critique):', err);
    }
  });
}

export async function snapshot(
  obj: Record<string, unknown> | null | undefined,
  sensitiveKeys: string[] = ['password', 'token', 'secret']
): Promise<any> {
  if (!obj) return null;
  const safe = { ...obj };
  for (const key of sensitiveKeys) delete safe[key];
  return JSON.parse(JSON.stringify(safe));
}
