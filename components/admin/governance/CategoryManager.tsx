"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { createCategory, createSubCategory, getCategories, toggleSubCategoryBlock } from '@/services/dr-governance.service';
import { Plus, ChevronDown, ChevronRight, Lock, Unlock, Package, Layers, Tag } from 'lucide-react';
import { useZone } from '@/context/ZoneContext';
import { useAuth } from '@/hooks/useAuth';
import ZoneSelector from '@/components/ui/ZoneSelector';

const C = {
  forest: '#064E3B', emerald: '#10B981', amber: '#D97706', red: '#EF4444',
  glass: 'rgba(255,255,255,0.72)', border: 'rgba(6,78,59,0.07)', muted: '#64748B', text: '#1F2937',
};

interface SubCategory {
  id: string;
  categoryId: string;
  name: string;
  blockedZoneIds: string[];
  standardPrices: any[];
  _count?: { products: number };
}

interface Category {
  id: string;
  name: string;
  description?: string | null;
  subCategories: SubCategory[];
}

export default function CategoryManager() {
  const { zoneId } = useZone();
  const { userRole, activeOrg } = useAuth();
  const isAdmin = userRole === 'SUPERADMIN' || userRole === 'ADMIN' || activeOrg?.role === 'ADMIN';
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // New category form
  const [showCatForm, setShowCatForm] = useState(false);
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [catLoading, setCatLoading] = useState(false);
  const [catMsg, setCatMsg] = useState<string | null>(null);

  // New subcategory form
  const [subCatFor, setSubCatFor] = useState<string | null>(null);
  const [subCatName, setSubCatName] = useState('');
  const [subLoading, setSubLoading] = useState(false);
  const [subMsg, setSubMsg] = useState<string | null>(null);

  // Lock toggle
  const [toggling, setToggling] = useState<string | null>(null);

  const loadCategories = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getCategories();
      if (result.success && result.data) {
        setCategories(result.data as Category[]);
      }
    } catch (e) {
      console.error('Failed to load categories', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadCategories(); }, [loadCategories]);

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleCreateCategory = async () => {
    if (!catName.trim()) return setCatMsg('Le nom est requis');
    setCatLoading(true);
    setCatMsg(null);
    try {
      const res = await createCategory({ name: catName.trim(), description: catDesc.trim() || undefined });
      if (res.success) {
        setCatMsg('Catégorie créée');
        setCatName('');
        setCatDesc('');
        setShowCatForm(false);
        loadCategories();
      } else {
        setCatMsg(res.error || 'Erreur');
      }
    } catch (e: any) {
      setCatMsg(e.message || 'Erreur');
    } finally {
      setCatLoading(false);
    }
  };

  const handleCreateSubCategory = async (categoryId: string) => {
    if (!subCatName.trim()) return setSubMsg('Le nom est requis');
    setSubLoading(true);
    setSubMsg(null);
    try {
      const res = await createSubCategory({ categoryId, name: subCatName.trim() });
      if (res.success) {
        setSubMsg('Sous-catégorie créée');
        setSubCatName('');
        setSubCatFor(null);
        loadCategories();
      } else {
        setSubMsg(res.error || 'Erreur');
      }
    } catch (e: any) {
      setSubMsg(e.message || 'Erreur');
    } finally {
      setSubLoading(false);
    }
  };

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
    } catch (e: any) {
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
        <div style={{
          background: C.glass, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20, marginBottom: 20,
        }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, color: C.forest }}>Créer une catégorie</h3>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <input placeholder="Nom de la catégorie" value={catName} onChange={e => setCatName(e.target.value)}
              style={{ flex: 1, minWidth: 200, padding: '10px 14px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 14 }} />
            <input placeholder="Description (optionnel)" value={catDesc} onChange={e => setCatDesc(e.target.value)}
              style={{ flex: 2, minWidth: 200, padding: '10px 14px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 14 }} />
            <button onClick={handleCreateCategory} disabled={catLoading} style={{
              padding: '10px 20px', borderRadius: 8, border: 'none', background: C.emerald, color: '#fff',
              fontWeight: 700, cursor: catLoading ? 'not-allowed' : 'pointer', opacity: catLoading ? 0.6 : 1,
            }}>
              {catLoading ? '...' : 'Créer'}
            </button>
            <button onClick={() => { setShowCatForm(false); setCatMsg(null); }} style={{
              padding: '10px 16px', borderRadius: 8, border: `1px solid ${C.border}`, background: 'transparent', cursor: 'pointer',
            }}>
              Annuler
            </button>
          </div>
          {catMsg && <div style={{ marginTop: 8, fontSize: 13, color: catMsg.includes('créée') ? C.emerald : C.red }}>{catMsg}</div>}
        </div>
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

                {cat.subCategories.map(sub => {
                  const isBlocked = zoneId ? sub.blockedZoneIds.includes(zoneId) : false;
                  const priceForZone = zoneId
                    ? sub.standardPrices.find((p: any) => p.zoneId === zoneId)
                    : null;

                  return (
                    <div key={sub.id} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 0', borderBottom: `1px solid ${C.border}`,
                      opacity: isBlocked ? 0.5 : 1,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <Tag size={14} color={isBlocked ? C.red : C.emerald} />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14, color: C.text }}>{sub.name}</div>
                          <div style={{ fontSize: 12, color: C.muted }}>
                            {sub._count?.products || 0} produits
                            {priceForZone && (
                              <span style={{ marginLeft: 8, color: C.emerald, fontWeight: 600 }}>
                                • Prix: {priceForZone.pricePerUnit} FCFA/{priceForZone.unit || 'KG'}
                              </span>
                            )}
                            {isBlocked && (
                              <span style={{ marginLeft: 8, color: C.red, fontWeight: 600 }}>• BLOQUÉE</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        {zoneId && (
                          <button
                            onClick={() => handleToggleBlock(sub.id, isBlocked)}
                            disabled={toggling === sub.id}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 6,
                              padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                              background: isBlocked ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                              color: isBlocked ? C.emerald : C.red,
                              fontWeight: 600, fontSize: 12,
                            }}
                          >
                            {isBlocked ? <Unlock size={14} /> : <Lock size={14} />}
                            {toggling === sub.id ? '...' : isBlocked ? 'Débloquer' : 'Bloquer'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Add subcategory button / form */}
                {subCatFor === cat.id ? (
                  <div style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'center' }}>
                    <input placeholder="Nom de la sous-catégorie" value={subCatName} onChange={e => setSubCatName(e.target.value)}
                      style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13 }} />
                    {isAdmin ? (
                      <button onClick={() => handleCreateSubCategory(cat.id)} disabled={subLoading} style={{
                      padding: '8px 14px', borderRadius: 8, border: 'none', background: C.emerald, color: '#fff',
                      fontWeight: 700, fontSize: 12, cursor: subLoading ? 'not-allowed' : 'pointer',
                      }}>
                        {subLoading ? '...' : 'Ajouter'}
                      </button>
                    ) : (
                      <div style={{ color: C.muted, fontSize: 13 }}>Seuls les administrateurs peuvent ajouter des sous-catégories.</div>
                    )}
                    <button onClick={() => { setSubCatFor(null); setSubMsg(null); }} style={{
                      padding: '8px 12px', borderRadius: 8, border: `1px solid ${C.border}`, background: 'transparent', cursor: 'pointer', fontSize: 12,
                    }}>
                      Annuler
                    </button>
                    {subMsg && <span style={{ fontSize: 12, color: subMsg.includes('créée') ? C.emerald : C.red }}>{subMsg}</span>}
                  </div>
                ) : (
                  <button onClick={() => { setSubCatFor(cat.id); setSubCatName(''); setSubMsg(null); }} style={{
                    display: 'flex', alignItems: 'center', gap: 6, marginTop: 12,
                    padding: '8px 14px', borderRadius: 8, border: `1px dashed ${C.border}`, background: 'transparent',
                    cursor: 'pointer', color: C.emerald, fontWeight: 600, fontSize: 12,
                  }}>
                    <Plus size={14} /> Ajouter une sous-catégorie
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: number; color: string }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(20px)',
      border: '1px solid rgba(6,78,59,0.07)', borderRadius: 14, padding: '16px 20px',
      display: 'flex', alignItems: 'center', gap: 14, minWidth: 160,
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 12,
        background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={20} color={color} />
      </div>
      <div>
        <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
        <div style={{ fontSize: 12, color: '#64748B', fontWeight: 500 }}>{label}</div>
      </div>
    </div>
  );
}
