import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq } from 'drizzle-orm';
import { audit } from '@/lib/audit';
import getUserIdFromSession from '@/lib/get-userId';
import { SUB_CATEGORY_UNITS, type SubCategoryUnit } from '@/lib/quantityUnit';
import { assertPlatformAdmin } from '@/features/governance/services/governance-guards';
import { asError } from '@/lib/errors';

export async function createCategory(data: { name: string; description?: string }) {
  const userId = await getUserIdFromSession();
  if (!userId) return { success: false, error: 'Session expirée' };

  try {
    const existing = await db.query.categories.findFirst({ where: eq(schema.categories.name, data.name) });
    if (existing) return { success: false, error: 'Cette catégorie existe déjà.' };

    const [category] = await db.insert(schema.categories).values(data).returning();

    await audit({
      action: 'CREATE_CATEGORY',
      actorId: userId,
      entityType: 'Category',
      entityId: category.id,
      newValue: { name: category.name },
    });

    return { success: true, data: category };
  } catch (_e: unknown) {
    const e = asError(_e);
    console.error('createCategory error:', e);
    return { success: false, error: e.message || 'Erreur interne' };
  }
}

export async function createSubCategory(data: { categoryId: string; name: string }) {
  const userId = await getUserIdFromSession();
  if (!userId) return { success: false, error: 'Session expirée' };

  try {
    const [sub] = await db.insert(schema.subCategories).values(data).returning();

    await audit({
      action: 'CREATE_SUBCATEGORY',
      actorId: userId,
      entityType: 'SubCategory',
      entityId: sub.id,
      newValue: { name: sub.name, categoryId: sub.categoryId },
    });

    return { success: true, data: sub };
  } catch (_e: unknown) {
    const e = asError(_e);
    console.error('createSubCategory error:', e);
    return { success: false, error: e.message || 'Erreur interne' };
  }
}

/**
 * Configure (ou efface) le seuil minimum de commande d'un TYPE de produit.
 *
 * Policy de PLATEFORME (2026-09-02, feature full-stack) — jamais une donnée
 * commerciale du producteur. `minimumOrderQuantity: null` EFFACE le seuil
 * (comportement historique restauré, aucune règle configurée) ; toute autre
 * valeur doit être strictement positive — 0 et les valeurs négatives sont
 * rejetés explicitement, jamais silencieusement coercés. `minimumOrderUnit`
 * est OBLIGATOIRE dès qu'une quantité est fournie (un seuil sans unité ne
 * veut rien dire) ; il est ignoré/effacé quand la quantité est `null`.
 *
 * Source de vérité UNIQUE (règle 10 du cahier des charges) : cette colonne
 * (`governance.sub_categories`) est la même table, dans la même base
 * Postgres, que celle lue par l'agent conversationnel
 * (`domain/governance/models.py::SubCategory`, SQLAlchemy) — aucune copie
 * indépendante côté agent, aucun cache à invalider manuellement.
 */
export async function updateSubCategoryMinimum(input: {
  subCategoryId: string;
  minimumOrderQuantity: number | null;
  minimumOrderUnit?: 'KG' | 'TONNE' | 'LITRE' | 'BAG' | null;
}) {
  try {
    const userId = await assertPlatformAdmin();

    const existing = await db.query.subCategories.findFirst({
      where: eq(schema.subCategories.id, input.subCategoryId),
    });
    if (!existing) return { success: false, error: 'Type de produit introuvable' };

    let nextQuantity: string | null = null;
    let nextUnit: 'KG' | 'TONNE' | 'LITRE' | 'BAG' | null = null;

    if (input.minimumOrderQuantity !== null && input.minimumOrderQuantity !== undefined) {
      const qty = Number(input.minimumOrderQuantity);
      if (!Number.isFinite(qty) || qty <= 0) {
        return { success: false, error: 'La quantité minimale doit être un nombre strictement positif (0 et les valeurs négatives sont interdits).' };
      }
      if (!input.minimumOrderUnit) {
        return { success: false, error: 'Une unité est requise dès qu\'une quantité minimale est définie.' };
      }
      nextQuantity = String(qty);
      nextUnit = input.minimumOrderUnit;
    }

    const [updated] = await db.update(schema.subCategories)
      .set({ minimumOrderQuantity: nextQuantity, minimumOrderUnit: nextUnit })
      .where(eq(schema.subCategories.id, input.subCategoryId))
      .returning();

    await audit({
      action: nextQuantity === null ? 'CLEAR_SUBCATEGORY_MINIMUM' : 'SET_SUBCATEGORY_MINIMUM',
      actorId: userId,
      entityType: 'SubCategory',
      entityId: updated.id,
      oldValue: { minimumOrderQuantity: existing.minimumOrderQuantity, minimumOrderUnit: existing.minimumOrderUnit },
      newValue: { minimumOrderQuantity: nextQuantity, minimumOrderUnit: nextUnit },
    });

    return { success: true, data: updated };
  } catch (_e: unknown) {
    const e = asError(_e);
    console.error('updateSubCategoryMinimum error:', e);
    return { success: false, error: e.message || 'Erreur interne' };
  }
}

/**
 * Configure (ou efface) l'unité de mesure d'un TYPE de produit : l'ensemble des
 * unités autorisées + l'unité PRIORITAIRE utilisée pour standardiser.
 *
 * Policy de PLATEFORME (2026-09-19, comme `updateSubCategoryMinimum` ci-dessus) —
 * jamais éditée par le producteur. Remplace la devinette historique du backend
 * agent (règle de secours codée en dur type "un élevage se compte à la tête"),
 * qui a produit des incidents réels (un bœuf vendu "au litre"...).
 *
 * `allowedUnits: null` EFFACE la config (retour au comportement historique du
 * backend — devinette depuis le texte libre). Sinon : au moins une unité de
 * `SUB_CATEGORY_UNITS`, `priorityUnit` doit être l'une d'elles si fournie, et
 * peut être omise seulement quand une seule unité est autorisée (le backend la
 * déduit alors automatiquement).
 *
 * Source de vérité UNIQUE (même table `governance.sub_categories`, même DB
 * Postgres partagée, lue directement par l'agent conversationnel
 * `services/database/base.py::get_product_category_unit_config` côté Python)
 * — aucune copie indépendante, aucun cache à invalider.
 */
export async function updateSubCategoryUnitConfig(input: {
  subCategoryId: string;
  allowedUnits: SubCategoryUnit[] | null;
  priorityUnit?: SubCategoryUnit | null;
}) {
  try {
    const userId = await assertPlatformAdmin();

    const existing = await db.query.subCategories.findFirst({
      where: eq(schema.subCategories.id, input.subCategoryId),
    });
    if (!existing) return { success: false, error: 'Type de produit introuvable' };

    let nextAllowed: string[] | null = null;
    let nextPriority: string | null = null;

    if (input.allowedUnits !== null && input.allowedUnits !== undefined) {
      const allowed = Array.from(new Set(input.allowedUnits));
      if (allowed.length === 0) {
        return { success: false, error: 'Sélectionnez au moins une unité autorisée (ou effacez la config).' };
      }
      const invalid = allowed.filter((u) => !SUB_CATEGORY_UNITS.includes(u));
      if (invalid.length > 0) {
        return { success: false, error: `Unité(s) inconnue(s) : ${invalid.join(', ')}.` };
      }

      if (input.priorityUnit) {
        if (!allowed.includes(input.priorityUnit)) {
          return { success: false, error: "L'unité prioritaire doit faire partie des unités autorisées." };
        }
        nextPriority = input.priorityUnit;
      } else if (allowed.length === 1) {
        // Une seule unité autorisée : le backend la déduit, mais on la fixe
        // aussi explicitement ici pour que l'admin la voie sans ambiguïté.
        nextPriority = allowed[0];
      } else {
        return { success: false, error: "Une unité prioritaire est requise dès que plusieurs unités sont autorisées." };
      }

      nextAllowed = allowed;
    }

    const [updated] = await db.update(schema.subCategories)
      .set({ allowedUnits: nextAllowed, priorityUnit: nextPriority })
      .where(eq(schema.subCategories.id, input.subCategoryId))
      .returning();

    await audit({
      action: nextAllowed === null ? 'CLEAR_SUBCATEGORY_UNIT_CONFIG' : 'SET_SUBCATEGORY_UNIT_CONFIG',
      actorId: userId,
      entityType: 'SubCategory',
      entityId: updated.id,
      oldValue: { allowedUnits: existing.allowedUnits, priorityUnit: existing.priorityUnit },
      newValue: { allowedUnits: nextAllowed, priorityUnit: nextPriority },
    });

    return { success: true, data: updated };
  } catch (_e: unknown) {
    const e = asError(_e);
    console.error('updateSubCategoryUnitConfig error:', e);
    return { success: false, error: e.message || 'Erreur interne' };
  }
}
