"use client";

import React, { useState } from 'react';
import { toggleSubCategoryBlock } from '@/features/governance/actions/categories.actions';
import { Plus, ChevronDown, ChevronRight, Package, Layers, Tag } from 'lucide-react';
import { useZone } from '@/context/ZoneContext';
import { useAuth } from '@/hooks/useAuth';
import ZoneSelector from '@/components/ui/ZoneSelector';
import { C } from '@/features/governance/components/category/category.config';
import StatCard from '@/features/governance/components/category/StatCard';
import { asError } from '@/lib/errors';
import { useCategoryList } from '@/features/governance/components/category/useCategoryList';
import { useCategoryCreation } from '@/features/governance/components/category/useCategoryCreation';
import { useMinimumEditor } from '@/features/governance/components/category/useMinimumEditor';
import { useUnitConfigEditor } from '@/features/governance/components/category/useUnitConfigEditor';

import CategoryCreateForm from '@/features/governance/components/category/CategoryCreateForm';
import SubCategoryItem from '@/features/governance/components/category/SubCategoryItem';
import AddSubCategory from '@/features/governance/components/category/AddSubCategory';

export default function CategoryManager() {
  const { zoneId } = useZone();
  const { userRole, activeOrg } = useAuth();
  const isAdmin = userRole === 'SUPERADMIN' || userRole === 'ADMIN' || activeOrg?.role === 'ADMIN';
  const { categories, loading, expanded, loadCategories, toggleExpand } = useCategoryList();
  const creation = useCategoryCreation(loadCategories);
  const { showCatForm, setShowCatForm, catName, setCatName, catDesc, setCatDesc, catLoading, catMsg, setCatMsg, handleCreateCategory } = creation;
  const minEditor = useMinimumEditor(loadCategories);
  const unitEditor = useUnitConfigEditor(loadCategories);


  // Lock toggle
  const [toggling, setToggling] = useState<string | null>(null);

  const handleToggleBlock = async (subCategoryId: string, currentlyBlocked: boolean) => {
    if (!zoneId) return alert('Sélectionnez une zone pour bloquer/débloquer');
    setToggling(subCategoryId);
    try {
      const res = await toggleSubCategoryBlock({
        subCategoryId,
        zoneId,
        block: !currentlyBlocked,
      });
      if (res.success) {
        loadCategories();
      } else {
        alert(res.error || 'Erreur');
      }
    } catch (_e: unknown) {
    const e = asError(_e);
      alert(e.message || 'Erreur');
    } finally {
      setToggling(null);
    }
  };

  const totalProducts = categories.reduce((sum, cat) =>
    sum + cat.subCategories.reduce((s, sub) => s + (sub._count?.products || 0), 0), 0);
  const totalSubs = categories.reduce((sum, cat) => sum + cat.subCategories.length, 0);

  return (
    <div>
      {/* Zone selector for block/unblock context */}
      <div style={{ marginBottom: 16 }}>
        <ZoneSelector />
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
        <StatCard icon={Layers} label="Catégories" value={categories.length} color={C.forest} />
        <StatCard icon={Tag} label="Sous-catégories" value={totalSubs} color={C.emerald} />
        <StatCard icon={Package} label="Produits liés" value={totalProducts} color={C.amber} />
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        {isAdmin ? (
          <button onClick={() => setShowCatForm(v => !v)} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 18px', borderRadius: 10, border: 'none', cursor: 'pointer',
            background: C.forest, color: '#fff', fontWeight: 700, fontSize: 13,
          }}>
            <Plus size={16} /> Nouvelle catégorie
          </button>
        ) : (
          <div style={{ color: C.muted, fontSize: 13, padding: 10 }}>Seuls les administrateurs peuvent créer des catégories.</div>
        )}
      </div>

      {/* Category create form */}
      {showCatForm && (
        <CategoryCreateForm
          name={catName}
          onNameChange={setCatName}
          description={catDesc}
          onDescriptionChange={setCatDesc}
          loading={catLoading}
          message={catMsg}
          onCreate={handleCreateCategory}
          onCancel={() => { setShowCatForm(false); setCatMsg(null); }}
        />
      )}

      {/* Loading */}
      {loading && <div style={{ padding: 20, color: C.muted }}>Chargement des catégories...</div>}

      {/* Categories list */}
      {!loading && categories.length === 0 && (
        <div style={{ padding: 40, textAlign: 'center', color: C.muted, background: C.glass, borderRadius: 14, border: `1px solid ${C.border}` }}>
          <Layers size={40} style={{ color: C.border, marginBottom: 12 }} />
          <div style={{ fontWeight: 700 }}>Aucune catégorie créée</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>Utilisez le bouton ci-dessus pour créer votre première catégorie de produit.</div>
        </div>
      )}

      {!loading && categories.map(cat => {
        const isExpanded = expanded.has(cat.id);
        return (
          <div key={cat.id} style={{
            background: '#fff', borderRadius: 14, border: `1px solid ${C.border}`,
            marginBottom: 12, overflow: 'hidden',
          }}>
            {/* Category header */}
            <div onClick={() => toggleExpand(cat.id)} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '14px 20px', cursor: 'pointer', userSelect: 'none',
              background: isExpanded ? 'rgba(16,185,129,0.04)' : 'transparent',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {isExpanded ? <ChevronDown size={18} color={C.forest} /> : <ChevronRight size={18} color={C.muted} />}
                <div>
                  <div style={{ fontWeight: 700, color: C.forest, fontSize: 15 }}>{cat.name}</div>
                  {cat.description && <div style={{ fontSize: 12, color: C.muted }}>{cat.description}</div>}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{
                  fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 100,
                  background: 'rgba(16,185,129,0.08)', color: C.emerald,
                }}>
                  {cat.subCategories.length} sous-cat.
                </span>
                <span style={{
                  fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 100,
                  background: 'rgba(217,119,6,0.08)', color: C.amber,
                }}>
                  {cat.subCategories.reduce((s, x) => s + (x._count?.products || 0), 0)} produits
                </span>
              </div>
            </div>

            {/* Expanded: subcategories */}
            {isExpanded && (
              <div style={{ borderTop: `1px solid ${C.border}`, padding: '12px 20px' }}>
                {cat.subCategories.length === 0 && (
                  <div style={{ fontSize: 13, color: C.muted, padding: '8px 0' }}>
                    Aucune sous-catégorie. Ajoutez-en une ci-dessous.
                  </div>
                )}

                {cat.subCategories.map(sub => (
                  <SubCategoryItem
                    key={sub.id}
                    sub={sub}
                    zoneId={zoneId}
                    isAdmin={isAdmin}
                    toggling={toggling}
                    onToggleBlock={handleToggleBlock}
                    minEditor={minEditor}
                    unitEditor={unitEditor}
                  />
                ))}

                <AddSubCategory categoryId={cat.id} isAdmin={isAdmin} creation={creation} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
