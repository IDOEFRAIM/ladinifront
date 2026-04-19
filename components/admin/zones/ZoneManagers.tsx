"use client";

import React, { useEffect, useState } from 'react';
import { useZone } from '@/context/ZoneContext';

export default function ZoneManagers() {
  const { zoneId } = useZone();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any | null>(null);
  const [identifier, setIdentifier] = useState('');
  const [members, setMembers] = useState<any[]>([]);
  const [query, setQuery] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!zoneId) {
      setData(null);
      return;
    }
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/zones/${zoneId}/managers`);
        if (!res.ok) {
          const t = await res.text().catch(() => '[non-text body]');
          console.error(`/api/zones/${zoneId}/managers error`, res.status, t);
          if (mounted) setData({ workZones: [], managedMembers: [], users: [] });
          return;
        }
        const j = await res.json();
        if (mounted) setData(j.success ? j.data : { workZones: [], managedMembers: [], users: [] });
      } catch (e) {
        console.error('Failed loading zone managers', e);
        if (mounted) setData({ workZones: [], managedMembers: [], users: [] });
      } finally { if (mounted) setLoading(false); }
    }
    load();
    // load org members for select/autocomplete
    (async function loadMembers() {
      try {
        const r = await fetch('/api/org/members');
        if (!r.ok) {
          const t = await r.text().catch(() => '');
          console.error('/api/org/members error', r.status, t);
          return;
        }
        const j = await r.json();
        if (j && j.success && Array.isArray(j.data)) setMembers(j.data as any[]);
      } catch (e) {
        console.error('Failed loading org members', e);
      }
    })();
    return () => { mounted = false; };
  }, [zoneId]);

  const assign = async () => {
    if (!zoneId) return setMsg('Zone non sélectionnée');
    setMsg(null);
    try {
      const payload: any = {};
      if (selectedUserId) payload.agentUserId = selectedUserId;
      else if (identifier) payload.agentIdentifier = identifier;
      else return setMsg('Veuillez sélectionner un membre ou saisir son email/téléphone');

      // include organization id when available to help server resolve active org
      const orgId = data?.workZones?.[0]?.organizationId || data?.managedMembers?.[0]?.organizationId;
      if (orgId) payload.orgId = orgId;

      const headers: any = { 'Content-Type': 'application/json' };
      if (orgId) headers['x-organization-id'] = orgId;
      const res = await fetch(`/api/zones/${zoneId}/managers`, { method: 'PATCH', headers, body: JSON.stringify(payload) });
      let j: any = null;
      if (!res.ok) {
        const t = await res.text().catch(() => '');
        console.error('/api/zones PATCH error', res.status, t);
        setMsg(t || 'Erreur serveur');
        return;
      }
      j = await res.json();
      if (res.ok && j && j.success) {
        setMsg('Responsable assigné avec succès');
        setIdentifier('');
        setSelectedUserId(null);
        setQuery('');
        // refresh managers
        const r = await fetch(`/api/zones/${zoneId}/managers`, { headers: orgId ? { 'x-organization-id': orgId } : undefined });
        if (r.ok) {
          const rr = await r.json();
          setData(rr.success ? rr.data : null);
        }
      } else {
        setMsg(j?.error || 'Erreur');
      }
    } catch (e) {
      console.error(e);
      setMsg('Erreur réseau');
    }
  };

  if (!zoneId) return (
    <div style={{ marginTop: 12, padding: 12, background: '#fff', borderRadius: 8 }}>
      <strong>Gestion des responsables</strong>
      <div style={{ fontSize: 13, color: '#6b7280' }}>Sélectionnez d'abord une zone pour voir ou assigner son directeur régional.</div>
    </div>
  );

  return (
    <div style={{ marginTop: 12, padding: 12, background: '#fff', borderRadius: 8 }}>
      <strong>Gestion des responsables</strong>
      {loading && <div style={{ color: '#6b7280' }}>Chargement...</div>}
      {!loading && data && (
        <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Work Zones</div>
            {data.workZones.length === 0 && <div style={{ color: '#6b7280' }}>Aucun enregistrement</div>}
            {data.workZones.map((w: any) => (
              <div key={w.id} style={{ padding: 8, borderBottom: '1px solid #f3f4f6' }}>
                <div>Org: {w.organizationId}</div>
                <div>ManagerId: {w.managerId || '—'}</div>
                <div>Role: {w.role}</div>
              </div>
            ))}
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Members (managedZoneId)</div>
            {data.managedMembers.length === 0 && <div style={{ color: '#6b7280' }}>Aucun membre assigné</div>}
            {data.managedMembers.map((m: any) => (
              <div key={m.id} style={{ padding: 8, borderBottom: '1px solid #f3f4f6' }}>
                <div>Org: {m.organizationId}</div>
                <div>UserId: {m.userId}</div>
                <div>Role: {m.role}</div>
              </div>
            ))}
          </div>

          <div style={{ minWidth: 320 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Assigner un responsable</div>
            <div style={{ marginBottom: 8 }}>
              <input placeholder="Rechercher un membre (nom)" value={query} onChange={e => setQuery(e.target.value)} style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #e5e7eb' }} />
            </div>
            <div style={{ maxHeight: 160, overflowY: 'auto', border: '1px solid #f3f4f6', borderRadius: 6 }}>
              {members.filter(m => {
                if (!query) return true;
                const q = query.toLowerCase();
                return String(m.name || '').toLowerCase().includes(q) || String(m.email || '').toLowerCase().includes(q) || String(m.phone || '').toLowerCase().includes(q);
              }).map(m => (
                <div key={m.membershipId} onClick={() => { setSelectedUserId(m.userId); setIdentifier(''); setMsg(null); }} style={{ padding: 8, cursor: 'pointer', background: selectedUserId === m.userId ? 'rgba(6,78,59,0.06)' : 'transparent' }}>
                  <div style={{ fontWeight: 700 }}>{m.name}</div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>{m.email || m.phone}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>Ou saisir email / téléphone manuellement</div>
              <input placeholder="Email ou téléphone" value={identifier} onChange={e => { setIdentifier(e.target.value); setSelectedUserId(null); }} style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #e5e7eb' }} />
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button onClick={assign} style={{ padding: '8px 12px', background: '#064E3B', color: '#fff', border: 'none', borderRadius: 6 }}>Assigner</button>
              <button onClick={() => { setIdentifier(''); setSelectedUserId(null); setQuery(''); setMsg(null); }} style={{ padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 6 }}>Annuler</button>
            </div>
            {msg && <div style={{ marginTop: 8, color: '#6b7280' }}>{msg}</div>}
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 12, color: '#6b7280' }}>Remarque: sélectionnez un membre de l'organisation, ou saisissez son email/téléphone. Seul un administrateur peut effectuer cette action.</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
