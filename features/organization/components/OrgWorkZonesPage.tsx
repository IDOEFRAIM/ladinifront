'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { getOrgWorkZones, getAvailableZones, assignWorkZone, updateWorkZone, removeWorkZone } from '@/features/organization/actions/org-zones.actions';
import { getOrgMembers } from '@/features/organization/actions/org-members.actions';
import { MessageBanner, PageSpinner, type BannerMessage } from '@/features/organization/components/shared';
import { MapPin, Plus } from 'lucide-react';
import type { WorkZoneItem, ZoneOption, MemberOption } from '@/features/organization/components/workzones/work-zones.types';
import WorkZoneGrid from '@/features/organization/components/workzones/WorkZoneGrid';
import AssignZoneModal from '@/features/organization/components/workzones/AssignZoneModal';
import EditZoneModal from '@/features/organization/components/workzones/EditZoneModal';

export default function OrgWorkZonesPage() {
  const [workZones, setWorkZones] = useState<WorkZoneItem[]>([]);
  const [zones, setZones] = useState<ZoneOption[]>([]);
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<BannerMessage>(null);

  // Assign modal
  const [showAssign, setShowAssign] = useState(false);
  const [assignZoneId, setAssignZoneId] = useState('');
  const [assignManagerId, setAssignManagerId] = useState('');
  const [assignRole, setAssignRole] = useState('');
  const [assignSaving, setAssignSaving] = useState(false);
  const [zoneSearch, setZoneSearch] = useState('');

  // Edit modal
  const [showEdit, setShowEdit] = useState(false);
  const [editWz, setEditWz] = useState<WorkZoneItem | null>(null);
  const [editManagerId, setEditManagerId] = useState('');
  const [editRole, setEditRole] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [wzRes, zonesRes, membersRes] = await Promise.all([
      getOrgWorkZones(),
      getAvailableZones(),
      getOrgMembers(),
    ]);
    if (wzRes.success && wzRes.data) setWorkZones(wzRes.data as WorkZoneItem[]);
    if (zonesRes.success && zonesRes.data) setZones(zonesRes.data as ZoneOption[]);
    if (membersRes.success && membersRes.data) {
      setMembers(
        (membersRes.data as Array<{ userId: string; name: string; email: string }>).map(m => ({
          userId: m.userId,
          name: m.name,
          email: m.email,
        }))
      );
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // ─── Filtered zones for combobox ───────────────────────────────────────
  const filteredZones = zoneSearch.trim()
    ? zones.filter(z =>
        z.name.toLowerCase().includes(zoneSearch.toLowerCase()) ||
        z.code.toLowerCase().includes(zoneSearch.toLowerCase())
      )
    : zones;

  // Already assigned zone IDs (to filter them out)
  const assignedZoneIds = new Set(workZones.map(wz => wz.zoneId));

  // ─── Assign ────────────────────────────────────────────────────────────
  function openAssign() {
    setAssignZoneId('');
    setAssignManagerId('');
    setAssignRole('');
    setZoneSearch('');
    setShowAssign(true);
  }

  async function handleAssign() {
    if (!assignZoneId) return;
    setAssignSaving(true);
    setMessage(null);

    const result = await assignWorkZone({
      zoneId: assignZoneId,
      managerId: assignManagerId || null,
      role: assignRole || null,
    });

    if (result.success) {
      setMessage({ type: 'success', text: 'Zone de travail assignée.' });
      setShowAssign(false);
      load();
    } else {
      setMessage({ type: 'error', text: result.error || 'Erreur.' });
    }
    setAssignSaving(false);
  }

  // ─── Edit ──────────────────────────────────────────────────────────────
  function openEdit(wz: WorkZoneItem) {
    setEditWz(wz);
    setEditManagerId(wz.manager?.id || '');
    setEditRole(wz.role || '');
    setShowEdit(true);
  }

  async function handleEdit() {
    if (!editWz) return;
    setEditSaving(true);
    setMessage(null);

    const result = await updateWorkZone(editWz.id, {
      managerId: editManagerId || null,
      role: editRole || null,
    });

    if (result.success) {
      setMessage({ type: 'success', text: 'Zone mise à jour.' });
      setShowEdit(false);
      load();
    } else {
      setMessage({ type: 'error', text: result.error || 'Erreur.' });
    }
    setEditSaving(false);
  }

  // ─── Remove ────────────────────────────────────────────────────────────
  async function handleRemove(id: string, name: string) {
    if (!confirm(`Retirer la zone « ${name} » de l'organisation ?`)) return;
    setMessage(null);
    const result = await removeWorkZone(id);
    if (result.success) {
      setMessage({ type: 'success', text: 'Zone retirée.' });
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
            <MapPin size={24} className="text-emerald-700" />
            <h1 className="text-2xl font-extrabold text-stone-900 tracking-tight">Zones de travail</h1>
          </div>
          <p className="text-sm text-stone-500">
            Définissez le périmètre géographique de chaque membre. Un agent ne verra que les données de sa zone assignée.
          </p>
        </div>
        <button
          onClick={openAssign}
          className="inline-flex items-center gap-2 bg-emerald-700 text-white py-2.5 px-5 rounded-full text-sm font-bold hover:bg-emerald-800 transition-colors"
        >
          <Plus size={16} /> Assigner une zone
        </button>
      </div>

      <MessageBanner message={message} />

      <WorkZoneGrid workZones={workZones} onAssign={openAssign} onEdit={openEdit} onRemove={handleRemove} />

      {showAssign && (
        <AssignZoneModal
          zoneSearch={zoneSearch}
          onZoneSearchChange={setZoneSearch}
          filteredZones={filteredZones}
          assignedZoneIds={assignedZoneIds}
          zoneId={assignZoneId}
          onZoneSelect={setAssignZoneId}
          members={members}
          managerId={assignManagerId}
          onManagerChange={setAssignManagerId}
          role={assignRole}
          onRoleChange={setAssignRole}
          saving={assignSaving}
          onConfirm={handleAssign}
          onClose={() => setShowAssign(false)}
        />
      )}

      {showEdit && editWz && (
        <EditZoneModal
          workZone={editWz}
          members={members}
          managerId={editManagerId}
          onManagerChange={setEditManagerId}
          role={editRole}
          onRoleChange={setEditRole}
          saving={editSaving}
          onConfirm={handleEdit}
          onClose={() => setShowEdit(false)}
        />
      )}
    </div>
  );
}
