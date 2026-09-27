"use client";

import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { createBuyerType, listBuyerTypes, updateBuyerType } from '@/features/governance/actions/buyer-types.actions';
import { Users, AlertCircle, CheckCircle2 } from 'lucide-react';
import { asError } from '@/lib/errors';
import { C, type BuyerType } from '@/features/governance/components/buyer-types/buyer-types.config';
import BuyerTypeCreateForm from '@/features/governance/components/buyer-types/BuyerTypeCreateForm';
import BuyerTypeRow from '@/features/governance/components/buyer-types/BuyerTypeRow';

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
    } catch (_e: unknown) {
    const e = asError(_e);
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
    } catch (_e: unknown) {
    const e = asError(_e);
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

      <BuyerTypeCreateForm
        isAdmin={isAdmin}
        name={name}
        onNameChange={setName}
        description={description}
        onDescriptionChange={setDescription}
        creating={creating}
        onCreate={handleCreate}
      />

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
            {rows.map((row) => (
              <BuyerTypeRow
                key={row.id}
                row={row}
                isAdmin={isAdmin}
                isEditing={editingId === row.id}
                saving={savingId === row.id}
                editName={editName}
                onEditNameChange={setEditName}
                editDescription={editDescription}
                onEditDescriptionChange={setEditDescription}
                onStartEdit={() => startEdit(row)}
                onCancel={cancelEdit}
                onSave={handleSave}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
