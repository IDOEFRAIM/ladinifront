'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { getOrgMembers, inviteOrgMember, updateOrgMember, removeOrgMember, getOrgProducers } from '@/features/organization/actions/org-members.actions';
import { getOrgRoles } from '@/features/organization/actions/org-roles.actions';
import { useAuth } from '@/hooks/useAuth';
import { MessageBanner, PageSpinner, type BannerMessage } from '@/features/organization/components/shared';
import { Users, Plus, Search } from 'lucide-react';
import { PAGE_SIZE, type MemberItem, type RoleOption, type ProducerOption } from '@/features/organization/components/members/members.config';
import MembersTable from '@/features/organization/components/members/MembersTable';
import InviteMemberModal from '@/features/organization/components/members/InviteMemberModal';
import EditMemberModal from '@/features/organization/components/members/EditMemberModal';

export default function OrgMembersPage() {
  const { userRole, activeOrg } = useAuth();
  const [members, setMembers] = useState<MemberItem[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<BannerMessage>(null);

  // Search & pagination
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // Invite modal
  const [showInvite, setShowInvite] = useState(false);
  const [inviteId, setInviteId] = useState('');
  const [inviteType, setInviteType] = useState<'producer' | 'other'>('producer');
  const [producerOptions, setProducerOptions] = useState<ProducerOption[]>([]);
  const [inviteOrgRole, setInviteOrgRole] = useState('FIELD_AGENT');
  const [inviteRoleDefId, setInviteRoleDefId] = useState('');
  const [inviteSaving, setInviteSaving] = useState(false);

  // Edit modal
  const [showEdit, setShowEdit] = useState(false);
  const [editMember, setEditMember] = useState<MemberItem | null>(null);
  const [editOrgRole, setEditOrgRole] = useState('');
  const [editRoleDefId, setEditRoleDefId] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  // Derive canInvite from auth context (no extra fetch needed)
  const canInvite = useMemo(() => {
    const sysRole = (userRole ?? '').toUpperCase();
    if (sysRole === 'SUPERADMIN' || sysRole === 'ADMIN') return true;
    const orgRole = (activeOrg?.role ?? '').toUpperCase();
    return orgRole === 'ADMIN';
  }, [userRole, activeOrg]);

  const load = useCallback(async () => {
    setLoading(true);
    const [membersRes, rolesRes, producersRes] = await Promise.all([
      getOrgMembers(),
      getOrgRoles(),
      getOrgProducers(),
    ]);
    if (membersRes.success && membersRes.data) setMembers(membersRes.data as MemberItem[]);
    if (rolesRes.success && rolesRes.data) {
      setRoles((rolesRes.data as Array<{ id: string; name: string }>).map(r => ({ id: r.id, name: r.name })));
    }
    if (producersRes.success && producersRes.data) {
      setProducerOptions(
        (producersRes.data as any[]).map(x => ({ id: x.id, businessName: x.businessName ?? x.userName ?? '', email: x.email ?? '', phone: x.phone }))
      );
    }
    setLoading(false);
  }, []);

  // Default role when inviting a non-producer (e.g., livreur)
  useEffect(() => {
    if (inviteType === 'other') setInviteOrgRole((prev) => prev === 'FIELD_AGENT' ? 'DELIVERY_AGENT' : prev);
  }, [inviteType]);

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

    // Prevent client-side invite attempts when not allowed
    if (canInvite === false) {
      setMessage({ type: 'error', text: 'Vous n\'êtes pas administrateur de cette organisation.' });
      setInviteSaving(false);
      return;
    }

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
      // Improve permission-related error messaging
      const err = (result.error || '').toString();
      if (/admin|droits insuffisants|accès refusé|autorisé/i.test(err)) {
        setMessage({ type: 'error', text: 'Permission refusée : vous devez être administrateur de l\'organisation.' });
      } else {
        setMessage({ type: 'error', text: err || 'Erreur.' });
      }
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

  if (loading) return <PageSpinner />;

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
          {canInvite === false && (
            <div className="mt-2 text-xs text-stone-500">Seuls les administrateurs peuvent inviter des membres.</div>
          )}
        </div>
        <button
          onClick={() => setShowInvite(true)}
          disabled={canInvite === false}
          title={canInvite === false ? 'Vous n\'êtes pas administrateur de cette organisation' : undefined}
          className={`inline-flex items-center gap-2 py-2.5 px-5 rounded-full text-sm font-bold transition-colors ${canInvite === false ? 'bg-stone-200 text-stone-400 cursor-not-allowed' : 'bg-emerald-700 text-white hover:bg-emerald-800'}`}
        >
          <Plus size={16} /> Inviter un membre
        </button>
      </div>

      <MessageBanner message={message} />

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
      <MembersTable
        members={paginated}
        search={search}
        page={page}
        totalPages={totalPages}
        count={filtered.length}
        onPageChange={setPage}
        onEdit={openEdit}
        onRemove={handleRemove}
      />

      {showInvite && (
        <InviteMemberModal
          type={inviteType}
          onTypeChange={setInviteType}
          id={inviteId}
          onIdChange={setInviteId}
          producerOptions={producerOptions}
          orgRole={inviteOrgRole}
          onOrgRoleChange={setInviteOrgRole}
          roleDefId={inviteRoleDefId}
          onRoleDefChange={setInviteRoleDefId}
          roles={roles}
          saving={inviteSaving}
          onConfirm={handleInvite}
          onClose={() => setShowInvite(false)}
        />
      )}

      {showEdit && editMember && (
        <EditMemberModal
          member={editMember}
          orgRole={editOrgRole}
          onOrgRoleChange={setEditOrgRole}
          roleDefId={editRoleDefId}
          onRoleDefChange={setEditRoleDefId}
          roles={roles}
          saving={editSaving}
          onConfirm={handleEdit}
          onClose={() => setShowEdit(false)}
        />
      )}
    </div>
  );
}
