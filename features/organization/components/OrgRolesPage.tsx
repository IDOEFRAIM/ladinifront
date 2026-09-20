'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { getOrgRoles, createOrgRole, updateOrgRole, deleteOrgRole } from '@/features/organization/actions/org-roles.actions';
import { MessageBanner, PageSpinner, type BannerMessage } from '@/features/organization/components/shared';
import { Shield, Plus } from 'lucide-react';
import type { RoleItem } from '@/features/organization/components/roles/roles.config';
import RolesList from '@/features/organization/components/roles/RolesList';
import RoleFormModal from '@/features/organization/components/roles/RoleFormModal';

export default function OrgRolesPage() {
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<BannerMessage>(null);

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

  if (loading) return <PageSpinner />;

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

      <MessageBanner message={message} />

      <RolesList roles={roles} onCreate={openCreateModal} onEdit={openEditModal} onDelete={handleDelete} />

      {showModal && (
        <RoleFormModal
          isEditing={!!editingRole}
          name={formName}
          onNameChange={setFormName}
          description={formDescription}
          onDescriptionChange={setFormDescription}
          permissions={formPermissions}
          onTogglePermission={togglePermission}
          onToggleGroup={toggleGroupAll}
          saving={formSaving}
          onConfirm={handleSave}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
