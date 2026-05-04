"use client";

import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { createBuyerType, listBuyerTypes, updateBuyerType } from '@/services/buyerTypes.service';
import { Plus, Save, Pencil, X, Users, AlertCircle, CheckCircle2 } from 'lucide-react';

const C = {
  forest: '#064E3B', emerald: '#10B981', amber: '#D97706', red: '#EF4444',
  glass: 'rgba(255,255,255,0.72)', border: 'rgba(6,78,59,0.07)', muted: '#64748B', text: '#1F2937',
};

type BuyerType = {
  id: string;
  name: string;
  description?: string | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
};

export default function BuyerTypeManager() {
  const { userRole, activeOrg } = useAuth();
  const isAdmin = userRole === 'SUPERADMIN' || userRole === 'ADMIN' || activeOrg?.role === 'ADMIN';

  const [rows, setRows] = useState<BuyerType[]>([]);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);

  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listBuyerTypes();
      if (res.success && res.data) setRows(res.data as any);
      else setRows([]);
    } catch (e) {
      console.error('Failed to load buyer types', e);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const startEdit = (row: BuyerType) => {
    setEditingId(row.id);
    setEditName(row.name || '');
    setEditDescription(row.description || '');
    setMessage(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditDescription('');
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      setMessage({ text: 'Le nom est requis', type: 'error' });
      return;
    }
    setCreating(true);
    setMessage(null);
    try {
      const res = await createBuyerType({ name: name.trim(), description: description.trim() || null });
      if (res.success) {
        setMessage({ text: 'Type d\'acheteur créé', type: 'success' });
        setName('');
        setDescription('');
        await load();
      } else {
        setMessage({ text: res.error || 'Erreur', type: 'error' });
      }
    } catch (e: any) {
      setMessage({ text: e?.message || 'Erreur serveur', type: 'error' });
    } finally {
      setCreating(false);
    }
  };

  const handleSave = async () => {
    if (!editingId) return;
    if (!editName.trim()) {
      setMessage({ text: 'Le nom est requis', type: 'error' });
      return;
    }

    setSavingId(editingId);
    setMessage(null);
    try {
      const res = await updateBuyerType({
        id: editingId,
        name: editName.trim(),
        description: editDescription.trim() || null,
      });
      if (res.success) {
        setMessage({ text: 'Type mis à jour', type: 'success' });
        cancelEdit();
        await load();
      } else {
        setMessage({ text: res.error || 'Erreur', type: 'error' });
      }
    } catch (e: any) {
      setMessage({ text: e?.message || 'Erreur serveur', type: 'error' });
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div>
      {!isAdmin && (
        <div style={{
          marginBottom: 12, padding: 10, borderRadius: 10,
          background: 'rgba(255,255,255,0.9)', border: `1px solid ${C.border}`, color: C.muted,
        }}>
          Seuls les administrateurs peuvent créer/modifier les types d&apos;acheteur (lecture seule pour les autres rôles).
        </div>
      )}

      {message && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px',
          borderRadius: 10, marginBottom: 16,
          background: message.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
          color: message.type === 'success' ? C.emerald : C.red, fontSize: 13, fontWeight: 600,
        }}>
          {message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {message.text}
        </div>
      )}

      {/* Create form */}
      <div style={{
        background: C.glass, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20, marginBottom: 16,
      }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, color: C.forest }}>
          Ajouter un type d&apos;acheteur
        </h3>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <input
            placeholder="Nom (ex: Boutique, Restaurant, Grossiste…)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={!isAdmin}
            style={{
              flex: 1, minWidth: 220, padding: '10px 14px', borderRadius: 8,
              border: `1px solid ${C.border}`, fontSize: 14,
              opacity: !isAdmin ? 0.7 : 1,
            }}
          />
          <input
            placeholder="Description (optionnel)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={!isAdmin}
            style={{
              flex: 2, minWidth: 220, padding: '10px 14px', borderRadius: 8,
              border: `1px solid ${C.border}`, fontSize: 14,
              opacity: !isAdmin ? 0.7 : 1,
            }}
          />
          <button
            onClick={handleCreate}
            disabled={!isAdmin || creating}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 18px', borderRadius: 10, border: 'none',
              background: isAdmin ? C.forest : '#e5e7eb',
              color: isAdmin ? '#fff' : C.muted,
              fontWeight: 700, fontSize: 13,
              cursor: !isAdmin ? 'not-allowed' : 'pointer',
              opacity: creating ? 0.6 : 1,
            }}
          >
            <Plus size={16} />
            {creating ? 'Création...' : 'Créer'}
          </button>
        </div>
      </div>

      {/* List */}
      {loading && <div style={{ padding: 20, color: C.muted }}>Chargement...</div>}

      {!loading && rows.length === 0 && (
        <div style={{
          padding: 40, textAlign: 'center', color: C.muted,
          background: C.glass, borderRadius: 14, border: `1px solid ${C.border}`,
        }}>
          <Users size={40} style={{ color: C.border, marginBottom: 12 }} />
          <div style={{ fontWeight: 700 }}>Aucun type d&apos;acheteur</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>Créez le premier type ci-dessus.</div>
        </div>
      )}

      {!loading && rows.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 14, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
          <div style={{
            padding: '12px 20px', background: 'rgba(6,78,59,0.03)',
            borderBottom: `1px solid ${C.border}`,
            fontWeight: 700, color: C.forest, fontSize: 14,
          }}>
            {rows.length} type(s)
          </div>

          <div style={{ padding: 12 }}>
            {rows.map((row) => {
              const isEditing = editingId === row.id;
              const saving = savingId === row.id;
              return (
                <div key={row.id} style={{
                  border: `1px solid ${C.border}`, borderRadius: 12, padding: 14, marginBottom: 10,
                  background: isEditing ? 'rgba(16,185,129,0.04)' : 'transparent',
                }}>
                  {!isEditing ? (
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                      <div style={{ minWidth: 200 }}>
                        <div style={{ fontWeight: 800, color: C.forest }}>{row.name}</div>
                        {row.description && <div style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>{row.description}</div>}
                      </div>
                      <button
                        onClick={() => startEdit(row)}
                        disabled={!isAdmin}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          padding: '8px 12px', borderRadius: 10,
                          border: `1px solid ${C.border}`,
                          background: 'transparent',
                          cursor: !isAdmin ? 'not-allowed' : 'pointer',
                          color: C.muted,
                          opacity: !isAdmin ? 0.6 : 1,
                          fontWeight: 700,
                        }}
                      >
                        <Pencil size={16} /> Modifier
                      </button>
                    </div>
                  ) : (
                    <div>
                      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        <input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          style={{ flex: 1, minWidth: 220, padding: '10px 14px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 14 }}
                        />
                        <input
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          placeholder="Description (optionnel)"
                          style={{ flex: 2, minWidth: 220, padding: '10px 14px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 14 }}
                        />
                      </div>

                      <div style={{ display: 'flex', gap: 10, marginTop: 10, justifyContent: 'flex-end' }}>
                        <button
                          onClick={cancelEdit}
                          disabled={saving}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            padding: '10px 14px', borderRadius: 10,
                            border: `1px solid ${C.border}`,
                            background: 'transparent',
                            cursor: saving ? 'not-allowed' : 'pointer',
                            color: C.muted,
                            fontWeight: 700,
                          }}
                        >
                          <X size={16} /> Annuler
                        </button>
                        <button
                          onClick={handleSave}
                          disabled={saving}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            padding: '10px 16px', borderRadius: 10,
                            border: 'none',
                            background: C.emerald,
                            color: '#fff',
                            cursor: saving ? 'not-allowed' : 'pointer',
                            opacity: saving ? 0.6 : 1,
                            fontWeight: 800,
                          }}
                        >
                          <Save size={16} /> {saving ? '...' : 'Enregistrer'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
