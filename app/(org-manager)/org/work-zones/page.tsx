'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  getOrgWorkZones,
  getOrgMembers,
  getAvailableZones,
  assignWorkZone,
  updateWorkZone,
  removeWorkZone,
} from '@/services/org-manager.service';
import { MapPin, Plus, Pencil, Trash2, X, Loader2, Check, Search, User } from 'lucide-react';

interface WorkZoneItem {
  id: string;
  zoneId: string;
  zoneName: string;
  zoneCode: string;
  zonePath: string | null;
  manager: { id: string; name: string | null; email: string | null } | null;
  role: string | null;
  createdAt: string;
}

interface ZoneOption {
  id: string;
  name: string;
  code: string;
  path: string | null;
  depth: number;
}

interface MemberOption {
  userId: string;
  name: string;
  email: string;
}

export default function OrgWorkZonesPage() {
  const [workZones, setWorkZones] = useState<WorkZoneItem[]>([]);
  const [zones, setZones] = useState<ZoneOption[]>([]);
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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

      {/* Work zones grid */}
      {workZones.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-stone-200">
          <MapPin size={40} className="mx-auto text-stone-300 mb-3" />
          <p className="text-stone-500 text-sm">Aucune zone de travail assignée.</p>
          <button onClick={openAssign} className="mt-3 text-emerald-700 text-sm font-bold hover:underline">
            Assigner la première zone
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {workZones.map(wz => (
            <div key={wz.id} className="bg-white rounded-2xl border border-stone-200 p-5 flex flex-col">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-base font-bold text-stone-900">{wz.zoneName}</h3>
                  <p className="text-xs text-stone-400 font-mono">{wz.zoneCode}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEdit(wz)}
                    className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-500 hover:text-stone-700 transition-colors"
                    title="Modifier"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => handleRemove(wz.id, wz.zoneName)}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-stone-400 hover:text-red-600 transition-colors"
                    title="Retirer"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {wz.zonePath && (
                <p className="text-xs text-stone-400 mb-2 truncate" title={wz.zonePath}>
                  {wz.zonePath}
                </p>
              )}

              <div className="mt-auto pt-3 border-t border-stone-100">
                {wz.manager ? (
                  <div className="flex items-center gap-2">
                    <User size={14} className="text-emerald-600" />
                    <span className="text-sm font-medium text-stone-700">{wz.manager.name || wz.manager.email}</span>
                    {wz.role && (
                      <span className="ml-auto text-xs bg-blue-50 text-blue-700 font-medium px-2 py-0.5 rounded">
                        {wz.role}
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-stone-300 text-sm">
                    <User size={14} /> Aucun manager assigné
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── Assign Modal (with zone combobox) ──────────────────────────── */}
      {showAssign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[85vh] overflow-hidden flex flex-col shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200">
              <h2 className="text-lg font-bold text-stone-900">Assigner une zone</h2>
              <button onClick={() => setShowAssign(false)} className="p-1 rounded-lg hover:bg-stone-100 text-stone-400">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              {/* Zone combobox */}
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase tracking-wide mb-1.5">
                  Zone *
                </label>
                <div className="relative mb-2">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="text"
                    value={zoneSearch}
                    onChange={e => setZoneSearch(e.target.value)}
                    placeholder="Rechercher une zone…"
                    className="w-full pl-9 pr-3 py-2 border border-stone-300 rounded-lg text-sm bg-white text-stone-900 placeholder:text-stone-400 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div className="max-h-40 overflow-y-auto border border-stone-200 rounded-lg">
                  {filteredZones.length === 0 ? (
                    <div className="px-3 py-4 text-center text-xs text-stone-400">Aucune zone trouvée</div>
                  ) : (
                    filteredZones.map(z => {
                      const isAssigned = assignedZoneIds.has(z.id);
                      const isSelected = assignZoneId === z.id;
                      return (
                        <button
                          key={z.id}
                          type="button"
                          disabled={isAssigned}
                          onClick={() => setAssignZoneId(z.id)}
                          className={`w-full flex items-center justify-between px-3 py-2 text-left text-sm border-b border-stone-50 last:border-0 transition-colors ${
                            isSelected ? 'bg-emerald-50 text-emerald-800' :
                            isAssigned ? 'bg-stone-50 text-stone-300 cursor-not-allowed' :
                            'hover:bg-stone-50 text-stone-700'
                          }`}
                        >
                          <div>
                            <span className="font-medium">{z.name}</span>
                            <span className="ml-2 text-xs text-stone-400 font-mono">{z.code}</span>
                          </div>
                          {isSelected && <Check size={14} className="text-emerald-600" />}
                          {isAssigned && <span className="text-xs text-stone-400">Déjà assignée</span>}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Manager select */}
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase tracking-wide mb-1.5">
                  Manager (optionnel)
                </label>
                <select
                  value={assignManagerId}
                  onChange={e => setAssignManagerId(e.target.value)}
                  className="w-full px-3 py-2.5 border border-stone-300 rounded-lg bg-white text-stone-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <option value="">Aucun</option>
                  {members.map(m => (
                    <option key={m.userId} value={m.userId}>{m.name} ({m.email})</option>
                  ))}
                </select>
              </div>

              {/* Role label */}
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase tracking-wide mb-1.5">
                  Étiquette de rôle (optionnel)
                </label>
                <input
                  type="text"
                  value={assignRole}
                  onChange={e => setAssignRole(e.target.value)}
                  className="w-full px-3 py-2.5 border border-stone-300 rounded-lg bg-white text-stone-900 placeholder:text-stone-400 focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="Ex: Superviseur de collecte"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-stone-200">
              <button
                onClick={() => setShowAssign(false)}
                className="px-5 py-2.5 rounded-full text-sm font-bold text-stone-600 hover:bg-stone-100"
              >
                Annuler
              </button>
              <button
                onClick={handleAssign}
                disabled={assignSaving || !assignZoneId}
                className="inline-flex items-center gap-2 bg-emerald-700 text-white px-5 py-2.5 rounded-full text-sm font-bold hover:bg-emerald-800 disabled:opacity-50"
              >
                {assignSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                Assigner
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Edit Modal ─────────────────────────────────────────────────── */}
      {showEdit && editWz && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200">
              <h2 className="text-lg font-bold text-stone-900">Modifier « {editWz.zoneName} »</h2>
              <button onClick={() => setShowEdit(false)} className="p-1 rounded-lg hover:bg-stone-100 text-stone-400">
                <X size={20} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase tracking-wide mb-1.5">Manager</label>
                <select
                  value={editManagerId}
                  onChange={e => setEditManagerId(e.target.value)}
                  className="w-full px-3 py-2.5 border border-stone-300 rounded-lg bg-white text-stone-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <option value="">Aucun</option>
                  {members.map(m => (
                    <option key={m.userId} value={m.userId}>{m.name} ({m.email})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase tracking-wide mb-1.5">
                  Étiquette de rôle
                </label>
                <input
                  type="text"
                  value={editRole}
                  onChange={e => setEditRole(e.target.value)}
                  className="w-full px-3 py-2.5 border border-stone-300 rounded-lg bg-white text-stone-900 placeholder:text-stone-400 focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="Ex: Superviseur de collecte"
                />
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
