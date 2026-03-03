'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  getOrgMembers,
  getOrgRoles,
  inviteOrgMember,
  updateOrgMember,
  removeOrgMember,
} from '@/services/org-manager.service';
import { getAdminProducers } from '@/services/admin.service';
import { Users, Plus, Pencil, Trash2, X, Loader2, Check, Search, ChevronLeft, ChevronRight } from 'lucide-react';

const ORG_ROLES = [
  { value: 'ADMIN', label: 'Administrateur' },
  { value: 'ZONE_MANAGER', label: 'Gestionnaire de Zone' },
  { value: 'SALES_MANAGER', label: 'Responsable Ventes' },
  { value: 'FIELD_AGENT', label: 'Agent de Terrain' },
] as const;

interface MemberItem {
  membershipId: string;
  userId: string;
  name: string;
  email: string;
  phone: string;
  systemRole: string;
  orgRole: string;
  roleDef: { id: string; name: string; permissions: string[] } | null;
  managedZone: { id: string; name: string } | null;
  joinedAt: string;
}

interface RoleOption {
  id: string;
  name: string;
}

const PAGE_SIZE = 10;

export default function OrgMembersPage() {
  const [members, setMembers] = useState<MemberItem[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Search & pagination
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // Invite modal
  const [showInvite, setShowInvite] = useState(false);
  const [inviteId, setInviteId] = useState('');
  const [producerOptions, setProducerOptions] = useState<Array<{ id: string; businessName: string; email: string }>>([]);
  const [inviteOrgRole, setInviteOrgRole] = useState('FIELD_AGENT');
  const [inviteRoleDefId, setInviteRoleDefId] = useState('');
  const [inviteSaving, setInviteSaving] = useState(false);

  // Edit modal
  const [showEdit, setShowEdit] = useState(false);
  const [editMember, setEditMember] = useState<MemberItem | null>(null);
  const [editOrgRole, setEditOrgRole] = useState('');
  const [editRoleDefId, setEditRoleDefId] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [membersRes, rolesRes] = await Promise.all([getOrgMembers(), getOrgRoles()]);
    if (membersRes.success && membersRes.data) setMembers(membersRes.data as MemberItem[]);
    if (rolesRes.success && rolesRes.data) {
      setRoles((rolesRes.data as Array<{ id: string; name: string }>).map(r => ({ id: r.id, name: r.name })));
    }
    try {
      const p = await getAdminProducers();
      if (p && p.success && 'data' in p && p.data) {
        setProducerOptions((p.data as any[]).map(x => ({ id: x.id, businessName: x.businessName, email: x.email })));
      }
    } catch (e) {
      // ignore
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Filtered + paginated
  const filtered = useMemo(() => {
    if (!search.trim()) return members;
    const q = search.toLowerCase();
    return members.filter(
      m => m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q) || m.phone.includes(q)
    );
  }, [members, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // ─── Invite ────────────────────────────────────────────────────────────
  async function handleInvite() {
    if (!inviteId.trim()) return;
    setInviteSaving(true);
    setMessage(null);

    const result = await inviteOrgMember({
      identifier: inviteId.trim(),
      orgRole: inviteOrgRole,
      roleDefId: inviteRoleDefId || null,
    });

    if (result.success) {
      setMessage({ type: 'success', text: 'Membre invité avec succès.' });
      setShowInvite(false);
      setInviteId('');
      setInviteOrgRole('FIELD_AGENT');
      setInviteRoleDefId('');
      load();
    } else {
      setMessage({ type: 'error', text: result.error || 'Erreur.' });
    }
    setInviteSaving(false);
  }

  // ─── Edit ──────────────────────────────────────────────────────────────
  function openEdit(m: MemberItem) {
    setEditMember(m);
    setEditOrgRole(m.orgRole);
    setEditRoleDefId(m.roleDef?.id || '');
    setShowEdit(true);
  }

  async function handleEdit() {
    if (!editMember) return;
    setEditSaving(true);
    setMessage(null);

    const result = await updateOrgMember(editMember.membershipId, {
      orgRole: editOrgRole,
      roleDefId: editRoleDefId || null,
    });

    if (result.success) {
      setMessage({ type: 'success', text: 'Membre mis à jour.' });
      setShowEdit(false);
      load();
    } else {
      setMessage({ type: 'error', text: result.error || 'Erreur.' });
    }
    setEditSaving(false);
  }

  // ─── Remove ────────────────────────────────────────────────────────────
  async function handleRemove(membershipId: string, name: string) {
    if (!confirm(`Retirer ${name} de l'organisation ?`)) return;
    setMessage(null);
    const result = await removeOrgMember(membershipId);
    if (result.success) {
      setMessage({ type: 'success', text: 'Membre retiré.' });
      load();
    } else {
      setMessage({ type: 'error', text: result.error || 'Erreur.' });
    }
  }

  function orgRoleLabel(role: string): string {
    return ORG_ROLES.find(r => r.value === role)?.label || role;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={28} className="animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Users size={24} className="text-emerald-700" />
            <h1 className="text-2xl font-extrabold text-stone-900 tracking-tight">Membres</h1>
          </div>
          <p className="text-sm text-stone-500">{members.length} membre{members.length > 1 ? 's' : ''} dans l&apos;organisation</p>
        </div>
        <button
          onClick={() => setShowInvite(true)}
          className="inline-flex items-center gap-2 bg-emerald-700 text-white py-2.5 px-5 rounded-full text-sm font-bold hover:bg-emerald-800 transition-colors"
        >
          <Plus size={16} /> Inviter un membre
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

      {/* Search */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
        <input
          type="text"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Rechercher par nom, email ou téléphone…"
          className="w-full pl-10 pr-4 py-2.5 border border-stone-300 rounded-xl bg-white text-stone-900 placeholder:text-stone-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
        />
      </div>

      {/* Data table */}
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200">
                <th className="text-left px-4 py-3 text-xs font-bold text-stone-500 uppercase tracking-wide">Membre</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-stone-500 uppercase tracking-wide">Contact</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-stone-500 uppercase tracking-wide">Rôle Org</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-stone-500 uppercase tracking-wide">Rôle Custom</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-stone-500 uppercase tracking-wide">Zone</th>
                <th className="text-right px-4 py-3 text-xs font-bold text-stone-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-stone-400">
                    {search ? 'Aucun résultat pour cette recherche.' : 'Aucun membre.'}
                  </td>
                </tr>
              ) : (
                paginated.map(m => (
                  <tr key={m.membershipId} className="border-b border-stone-100 hover:bg-stone-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-stone-900">{m.name}</div>
                      <div className="text-xs text-stone-400">{m.systemRole}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-stone-700">{m.email}</div>
                      <div className="text-xs text-stone-400">{m.phone}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block text-xs font-bold px-2.5 py-1 rounded-md ${
                        m.orgRole === 'ADMIN' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {orgRoleLabel(m.orgRole)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-stone-600">
                      {m.roleDef ? m.roleDef.name : <span className="text-stone-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-stone-600">
                      {m.managedZone ? m.managedZone.name : <span className="text-stone-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(m)}
                          className="p-2 rounded-lg hover:bg-stone-100 text-stone-500 hover:text-stone-700 transition-colors"
                          title="Modifier"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleRemove(m.membershipId, m.name)}
                          className="p-2 rounded-lg hover:bg-red-50 text-stone-400 hover:text-red-600 transition-colors"
                          title="Retirer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-stone-200 bg-stone-50">
            <span className="text-xs text-stone-500">
              {filtered.length} résultat{filtered.length > 1 ? 's' : ''} · Page {page}/{totalPages}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg hover:bg-stone-200 disabled:opacity-30 text-stone-500"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg hover:bg-stone-200 disabled:opacity-30 text-stone-500"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ─── Invite Modal ───────────────────────────────────────────────── */}
      {showInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200">
              <h2 className="text-lg font-bold text-stone-900">Inviter un membre</h2>
              <button onClick={() => setShowInvite(false)} className="p-1 rounded-lg hover:bg-stone-100 text-stone-400">
                <X size={20} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase tracking-wide mb-1.5">
                  Sélectionner un producteur à inviter *
                </label>
                <select
                  value={inviteId}
                  onChange={e => setInviteId(e.target.value)}
                  className="w-full px-3 py-2.5 border border-stone-300 rounded-lg bg-white text-stone-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <option value="">Choisir un producteur...</option>
                  {producerOptions.map(p => (
                    <option key={p.id} value={p.email}>{p.businessName} — {p.email}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase tracking-wide mb-1.5">
                  Rôle organisationnel *
                </label>
                <select
                  value={inviteOrgRole}
                  onChange={e => setInviteOrgRole(e.target.value)}
                  className="w-full px-3 py-2.5 border border-stone-300 rounded-lg bg-white text-stone-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  {ORG_ROLES.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase tracking-wide mb-1.5">
                  Rôle personnalisé (optionnel)
                </label>
                <select
                  value={inviteRoleDefId}
                  onChange={e => setInviteRoleDefId(e.target.value)}
                  className="w-full px-3 py-2.5 border border-stone-300 rounded-lg bg-white text-stone-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <option value="">Aucun</option>
                  {roles.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-stone-200">
              <button
                onClick={() => setShowInvite(false)}
                className="px-5 py-2.5 rounded-full text-sm font-bold text-stone-600 hover:bg-stone-100"
              >
                Annuler
              </button>
              <button
                onClick={handleInvite}
                disabled={inviteSaving || !inviteId.trim()}
                className="inline-flex items-center gap-2 bg-emerald-700 text-white px-5 py-2.5 rounded-full text-sm font-bold hover:bg-emerald-800 disabled:opacity-50"
              >
                {inviteSaving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                Inviter
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Edit Modal ─────────────────────────────────────────────────── */}
      {showEdit && editMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200">
              <h2 className="text-lg font-bold text-stone-900">Modifier {editMember.name}</h2>
              <button onClick={() => setShowEdit(false)} className="p-1 rounded-lg hover:bg-stone-100 text-stone-400">
                <X size={20} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase tracking-wide mb-1.5">
                  Rôle organisationnel
                </label>
                <select
                  value={editOrgRole}
                  onChange={e => setEditOrgRole(e.target.value)}
                  className="w-full px-3 py-2.5 border border-stone-300 rounded-lg bg-white text-stone-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  {ORG_ROLES.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase tracking-wide mb-1.5">
                  Rôle personnalisé
                </label>
                <select
                  value={editRoleDefId}
                  onChange={e => setEditRoleDefId(e.target.value)}
                  className="w-full px-3 py-2.5 border border-stone-300 rounded-lg bg-white text-stone-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <option value="">Aucun</option>
                  {roles.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-stone-200">
              <button
                onClick={() => setShowEdit(false)}
                className="px-5 py-2.5 rounded-full text-sm font-bold text-stone-600 hover:bg-stone-100"
              >
                Annuler
              </button>
              <button
                onClick={handleEdit}
                disabled={editSaving}
                className="inline-flex items-center gap-2 bg-emerald-700 text-white px-5 py-2.5 rounded-full text-sm font-bold hover:bg-emerald-800 disabled:opacity-50"
              >
                {editSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
