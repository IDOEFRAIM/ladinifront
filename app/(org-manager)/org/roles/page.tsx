'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  getOrgRoles,
  createOrgRole,
  updateOrgRole,
  deleteOrgRole,
} from '@/services/org-manager.service';
import { PERMISSIONS } from '@/lib/permissions';
import { Shield, Plus, Pencil, Trash2, X, Loader2, Check, Users } from 'lucide-react';

// ─── Permission groups for the multi-select UI ──────────────────────────────
const PERMISSION_GROUPS: Record<string, string[]> = {
  'Territoires & Zones': ['ZONE_VIEW', 'ZONE_MANAGE', 'LOCATION_VIEW', 'LOCATION_EDIT', 'LOCATION_DELETE'],
  'Stocks & Inventaire': ['STOCK_VIEW', 'STOCK_EDIT', 'STOCK_DELETE', 'STOCK_VERIFY'],
  'Commandes': ['ORDER_VIEW', 'ORDER_CREATE', 'ORDER_VALIDATE', 'ORDER_CANCEL'],
  'Produits': ['PRODUCT_VIEW', 'PRODUCT_EDIT', 'PRODUCT_DELETE', 'PRODUCT_VERIFY'],
  'Utilisateurs': ['USER_VIEW', 'USER_EDIT', 'USER_BAN', 'ROLE_MANAGE'],
  'Producteurs': ['PRODUCER_VIEW', 'PRODUCER_CREATE', 'PRODUCER_VALIDATE', 'PRODUCER_SUSPEND', 'PRODUCER_DELETE'],
  'Organisation': ['ORG_VIEW', 'ORG_MANAGE', 'ORG_INVITE'],
  'Monitoring & Agents': ['MONITORING_VIEW', 'AGENT_APPROVE', 'AGENT_TELEMETRY_VIEW'],
  'Entrepôts & Lots': ['WAREHOUSE_VIEW', 'WAREHOUSE_EDIT', 'BATCH_VIEW', 'BATCH_EDIT'],
  'Finance & KPIs': ['FINANCE_VIEW', 'FORECAST_VIEW', 'ZONE_METRIC_VIEW'],
  'Audit': ['AUDIT_VIEW'],
};

interface RoleItem {
  id: string;
  name: string;
  description: string | null;
  permissions: string[];
  membersCount: number;
  createdAt: string;
}

export default function OrgRolesPage() {
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleItem | null>(null);
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formPermissions, setFormPermissions] = useState<Set<string>>(new Set());
  const [formSaving, setFormSaving] = useState(false);

  const loadRoles = useCallback(async () => {
    setLoading(true);
    const result = await getOrgRoles();
    if (result.success && result.data) {
      setRoles(result.data as RoleItem[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadRoles(); }, [loadRoles]);

  function openCreateModal() {
    setEditingRole(null);
    setFormName('');
    setFormDescription('');
    setFormPermissions(new Set());
    setShowModal(true);
  }

  function openEditModal(role: RoleItem) {
    setEditingRole(role);
    setFormName(role.name);
    setFormDescription(role.description || '');
    setFormPermissions(new Set(role.permissions));
    setShowModal(true);
  }

  function togglePermission(perm: string) {
    setFormPermissions(prev => {
      const next = new Set(prev);
      if (next.has(perm)) next.delete(perm);
      else next.add(perm);
      return next;
    });
  }

  function toggleGroupAll(perms: string[]) {
    setFormPermissions(prev => {
      const next = new Set(prev);
      const allSelected = perms.every(p => next.has(p));
      if (allSelected) {
        perms.forEach(p => next.delete(p));
      } else {
        perms.forEach(p => next.add(p));
      }
      return next;
    });
  }

  async function handleSave() {
    if (!formName.trim()) return;
    if (formPermissions.size === 0) {
      setMessage({ type: 'error', text: 'Sélectionnez au moins une permission.' });
      return;
    }

    setFormSaving(true);
    setMessage(null);

    const payload = {
      name: formName.trim(),
      description: formDescription.trim() || null,
      permissions: Array.from(formPermissions),
    };

    const result = editingRole
      ? await updateOrgRole(editingRole.id, payload)
      : await createOrgRole(payload);

    if (result.success) {
      setMessage({ type: 'success', text: editingRole ? 'Rôle mis à jour.' : 'Rôle créé.' });
      setShowModal(false);
      loadRoles();
    } else {
      setMessage({ type: 'error', text: result.error || 'Erreur.' });
    }
    setFormSaving(false);
  }

  async function handleDelete(roleId: string) {
    if (!confirm('Supprimer ce rôle ? Cette action est irréversible.')) return;
    setMessage(null);
    const result = await deleteOrgRole(roleId);
    if (result.success) {
      setMessage({ type: 'success', text: 'Rôle supprimé.' });
      loadRoles();
    } else {
      setMessage({ type: 'error', text: result.error || 'Erreur.' });
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={28} className="animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Shield size={24} className="text-emerald-700" />
            <h1 className="text-2xl font-extrabold text-stone-900 tracking-tight">Gestion des rôles</h1>
          </div>
          <p className="text-sm text-stone-500">
            Définissez des rôles avec des permissions granulaires pour vos membres.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 bg-emerald-700 text-white py-2.5 px-5 rounded-full text-sm font-bold hover:bg-emerald-800 transition-colors"
        >
          <Plus size={16} /> Nouveau rôle
        </button>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`mb-6 px-4 py-3 rounded-xl text-sm font-medium ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Roles list */}
      {roles.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-stone-200">
          <Shield size={40} className="mx-auto text-stone-300 mb-3" />
          <p className="text-stone-500 text-sm">Aucun rôle personnalisé défini.</p>
          <button onClick={openCreateModal} className="mt-3 text-emerald-700 text-sm font-bold hover:underline">
            Créer le premier rôle
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {roles.map(role => (
            <div key={role.id} className="bg-white rounded-2xl border border-stone-200 p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-base font-bold text-stone-900">{role.name}</h3>
                  {role.description && (
                    <p className="text-sm text-stone-500 mt-0.5">{role.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 bg-stone-100 text-stone-600 text-xs font-bold px-2.5 py-1 rounded-md">
                    <Users size={12} /> {role.membersCount}
                  </span>
                  <button
                    onClick={() => openEditModal(role)}
                    className="p-2 rounded-lg hover:bg-stone-100 text-stone-500 hover:text-stone-700 transition-colors"
                    title="Modifier"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => handleDelete(role.id)}
                    className="p-2 rounded-lg hover:bg-red-50 text-stone-400 hover:text-red-600 transition-colors"
                    title="Supprimer"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {role.permissions.map(p => (
                  <span key={p} className="bg-emerald-50 text-emerald-700 text-xs font-medium px-2 py-0.5 rounded">
                    {p}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── Create/Edit Modal ──────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-xl">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200">
              <h2 className="text-lg font-bold text-stone-900">
                {editingRole ? 'Modifier le rôle' : 'Nouveau rôle'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded-lg hover:bg-stone-100 text-stone-400"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {/* Name */}
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase tracking-wide mb-1.5">
                  Nom du rôle *
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  className="w-full px-3 py-2.5 border border-stone-300 rounded-lg bg-white text-stone-900 placeholder:text-stone-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  placeholder="Ex: Superviseur de Collecte"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase tracking-wide mb-1.5">
                  Description
                </label>
                <input
                  type="text"
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  className="w-full px-3 py-2.5 border border-stone-300 rounded-lg bg-white text-stone-900 placeholder:text-stone-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  placeholder="Optionnel"
                />
              </div>

              {/* Permissions multi-select */}
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase tracking-wide mb-3">
                  Permissions * ({formPermissions.size} sélectionnée{formPermissions.size > 1 ? 's' : ''})
                </label>

                <div className="space-y-4">
                  {Object.entries(PERMISSION_GROUPS).map(([group, perms]) => {
                    const allSelected = perms.every(p => formPermissions.has(p));
                    const someSelected = perms.some(p => formPermissions.has(p));
                    return (
                      <div key={group} className="border border-stone-200 rounded-xl p-3">
                        <button
                          type="button"
                          onClick={() => toggleGroupAll(perms)}
                          className="flex items-center gap-2 text-sm font-bold text-stone-700 mb-2 hover:text-emerald-700 transition-colors"
                        >
                          <div
                            className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                              allSelected
                                ? 'bg-emerald-600 border-emerald-600'
                                : someSelected
                                ? 'bg-emerald-200 border-emerald-400'
                                : 'border-stone-300'
                            }`}
                          >
                            {(allSelected || someSelected) && <Check size={10} className="text-white" />}
                          </div>
                          {group}
                        </button>
                        <div className="grid grid-cols-2 gap-1">
                          {perms.map(perm => (
                            <label
                              key={perm}
                              className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-stone-50 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={formPermissions.has(perm)}
                                onChange={() => togglePermission(perm)}
                                className="accent-emerald-600 w-3.5 h-3.5"
                              />
                              <span className="text-xs text-stone-600 font-medium">{perm}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-stone-200">
              <button
                onClick={() => setShowModal(false)}
                className="px-5 py-2.5 rounded-full text-sm font-bold text-stone-600 hover:bg-stone-100 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleSave}
                disabled={formSaving || !formName.trim() || formPermissions.size === 0}
                className="inline-flex items-center gap-2 bg-emerald-700 text-white px-5 py-2.5 rounded-full text-sm font-bold hover:bg-emerald-800 transition-colors disabled:opacity-50"
              >
                {formSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                {editingRole ? 'Mettre à jour' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
