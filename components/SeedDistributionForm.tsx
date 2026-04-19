"use client";
import { useState } from 'react';
import { useEffect } from 'react';

interface Allocation {
  id: string;
  seedType?: string;
  remainingQuantity?: number;
  organizationId?: string;
  orgId?: string;
  zoneId?: string;
  zone?: string;
}

interface Member {
  id?: string;
  userId?: string;
  name?: string;
  displayName?: string;
  email?: string;
  user?: { id?: string; name?: string; email?: string };
}

interface SeedDistributionFormProps {
  allocations?: Allocation[];
  members?: Member[];
}

export default function SeedDistributionForm({ allocations = [], members = [] }: SeedDistributionFormProps) {
  const [quantity, setQuantity] = useState(0);
  const [code, setCode] = useState('');
  const [lastCode, setLastCode] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedAllocation, setSelectedAllocation] = useState(allocations[0]?.id ?? '');
  const [producerId, setProducerId] = useState('');
  const [producerQuery, setProducerQuery] = useState('');
  const [producerSuggestions, setProducerSuggestions] = useState<any[]>([]);
  const [selectedProducer, setSelectedProducer] = useState<any | null>(null);
  const [assignedTo, setAssignedTo] = useState(members[0]?.userId ?? '');
  const [loadedMembers, setLoadedMembers] = useState<Member[]>(members ?? []);
  const [distributionId, setDistributionId] = useState<string | null>(null);

  useEffect(() => {
    // if no members passed as prop, try to fetch members for current org/user
    if ((!members || members.length === 0) && (assignedTo === '' || !assignedTo)) {
      (async () => {
        try {
          const res = await fetch('/api/org/members');
          if (res.ok) {
            const j = await res.json();
            // API returns { success: true, data: [...] }
            const list = Array.isArray(j?.data) ? j.data : (Array.isArray(j?.members) ? j.members : []);
            if (list.length) {
              setLoadedMembers(list);
              setAssignedTo(list[0].userId ?? list[0].id ?? '');
            }
          }
        } catch (e) {
          // ignore fetch errors; UI still usable if admin passes members prop
          console.debug('Could not fetch members for SeedDistributionForm', e);
        }
      })();
    } else if (members && members.length) {
      // normalize members passed as prop into loadedMembers
      setLoadedMembers(members);
      if (!assignedTo) setAssignedTo(members[0].userId ?? members[0].id ?? '');
    }
  }, []);

  // fetch producers suggestions as the user types (simple debounce)
  useEffect(() => {
    let mounted = true;
    const q = producerQuery.trim();
    if (!q) {
      setProducerSuggestions([]);
      return;
    }
    const id = setTimeout(async () => {
      try {
        // try test producers route (available in dev) as a fallback
        const res = await fetch('/api/test/producers?q=' + encodeURIComponent(q));
        if (!mounted) return;
        if (res.ok) {
          const j = await res.json();
          const list = Array.isArray(j?.producers) ? j.producers : (Array.isArray(j?.data) ? j.data : []);
          setProducerSuggestions(list.slice(0, 10));
        } else {
          setProducerSuggestions([]);
        }
      } catch (e) {
        console.debug('producer search failed', e);
        setProducerSuggestions([]);
      }
    }, 300);

    return () => {
      mounted = false;
      clearTimeout(id);
    };
  }, [producerQuery]);

  async function createDistribution(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    // include organizationId and zoneId from the selected allocation so
    // server-side authorization can validate org/zone membership
    const selAlloc = allocations.find(a => String(a.id) === String(selectedAllocation));
    const organizationId = selAlloc?.organizationId ?? selAlloc?.orgId ?? null;
    const zoneId = selAlloc?.zoneId ?? selAlloc?.zone ?? null;
    const res = await fetch('/api/inventory/distribute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ allocationId: selectedAllocation, producerId, agentId: 'agent-placeholder', quantity, assignedTo, organizationId, zoneId }),
    });
    const j = await res.json();
    if (res.ok && j.distributionId) {
      setDistributionId(j.distributionId);
      setMessage('Distribution created. Verification code was sent via secure channel.');
      // reset selection to avoid stale persistent selection
      setSelectedProducer(null);
      setProducerId('');
      setProducerQuery('');
    } else {
      setMessage(j?.error ? String(j.error) : 'Failed to create distribution');
    }
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    const res = await fetch('/api/inventory/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ distributionId: distributionId, code }),
    });
    const j = await res.json();
    if (res.ok && j.ok) setMessage('Verified and completed'); else setMessage('Verification failed');
  }

  return (
    <div style={{ maxWidth: 920, margin: '16px 8px', color: 'var(--foreground)' }}>
      <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 12, padding: 20, boxShadow: '0 1px 4px rgba(6,78,59,0.04)' }}>
        <h3 style={{ margin: 0, marginBottom: 12, color: 'var(--foreground)', fontWeight: 700 }}>Create seed distribution</h3>
        <form onSubmit={createDistribution} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'end' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label style={{ fontWeight: 700, marginBottom: 6 }}>Allocation</label>
            <select value={selectedAllocation} onChange={(e) => setSelectedAllocation(e.target.value)} style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'white', color: 'var(--foreground)' }}>
              <option value="" disabled={allocations.length > 0}>{allocations.length ? '-- select allocation --' : 'No allocations available'}</option>
              {allocations.map((a) => (
                <option key={a.id} value={a.id}>{a.seedType} — {a.remainingQuantity} left</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
            <label style={{ fontWeight: 700, marginBottom: 6 }}>Producer (search)</label>
            <input
              placeholder="Search by name, email or zone"
              value={producerQuery}
              onChange={(e) => {
                setProducerQuery(e.target.value);
                // clear selected id when user types
                setProducerId('');
              }}
              style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)' }}
            />
            {producerSuggestions.length > 0 && (
              <div style={{ position: 'absolute', left: 0, right: 0, top: 'calc(100% + 6px)', background: 'white', border: '1px solid var(--border)', borderRadius: 8, zIndex: 40, maxHeight: 220, overflowY: 'auto' }}>
                {producerSuggestions.map((p) => {
                    const id = p.id ?? p.producerId ?? p.userId ?? p.id;
                    const label = p.businessName || p.email || `${p.zone || p.zoneName || ''}` || id;
                    return (
                      <div
                        key={id}
                        onClick={() => {
                          setProducerId(id);
                          setProducerQuery(label);
                          setProducerSuggestions([]);
                          setSelectedProducer(p);
                        }}
                        style={{ padding: '8px 10px', cursor: 'pointer', borderBottom: '1px solid rgba(0,0,0,0.04)' }}
                      >
                        <div style={{ fontWeight: 700 }}>{p.businessName || label}</div>
                        <div style={{ fontSize: 12, color: 'var(--muted)' }}>{p.email || p.zone || p.zoneName || id}</div>
                      </div>
                    );
                  })}
              </div>
            )}
            {producerId && <div style={{ marginTop: 8, fontSize: 12, color: 'var(--muted)' }}>Selected ID: {producerId}</div>}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label style={{ fontWeight: 700, marginBottom: 6 }}>Quantity</label>
            <input type="number" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label style={{ fontWeight: 700, marginBottom: 6 }}>Assign to member</label>
            <select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'white', color: 'var(--foreground)' }}>
              <option value="">-- select member --</option>
              {loadedMembers.map((m) => {
                const id = m.userId ?? m.id ?? m.user?.id;
                const label = m.name ?? m.displayName ?? m.user?.name ?? m.email ?? m.user?.email ?? id;
                return <option key={id} value={id}>{label}</option>;
              })}
            </select>
          </div>

          <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 12, marginTop: 6 }}>
            <button type="submit" style={{ background: 'var(--foreground)', color: 'white', padding: '10px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700 }}>Create Distribution</button>
            <div style={{ alignSelf: 'center', color: 'var(--muted)' }}>{distributionId ? `Last id: ${distributionId}` : ''}</div>
          </div>

        {/* Confirmation summary: make it explicit who will receive what and from which agent */}
        <div style={{ marginTop: 12, padding: 12, borderRadius: 8, background: '#f8faf8', border: '1px solid var(--border)' }}>
          <strong>Confirmation :</strong>
          <div style={{ marginTop: 8, color: 'var(--muted)' }}>
            {selectedProducer && selectedAllocation && assignedTo && quantity ? (
              <div>
                Le producteur <strong>{selectedProducer.businessName || selectedProducer.email || selectedProducer.id}</strong>
                {selectedProducer.email ? ` (${selectedProducer.email})` : selectedProducer.phone ? ` (${selectedProducer.phone})` : ''}
                {' '}recevra <strong>{quantity}</strong> unité(s) de <strong>{allocations.find(a => String(a.id) === String(selectedAllocation))?.seedType || 'cet article'}</strong>.
                {' '}Le lot sera remis par <strong>{(loadedMembers.find(m => (m.userId ?? m.id) === assignedTo)?.name) || assignedTo}</strong> (agent).
              </div>
            ) : (
              <div>Choisissez un producteur, une allocation, une quantité et un agent pour voir le récapitulatif ici.</div>
            )}
          </div>
        </div>
        </form>

        <hr style={{ border: 0, borderTop: '1px solid var(--border)', margin: '18px 0' }} />

        <form onSubmit={verifyCode} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            <label style={{ fontWeight: 700, marginBottom: 6 }}>Enter code to verify</label>
            <input value={code} onChange={(e) => setCode(e.target.value)} style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)' }} />
          </div>
          <button type="submit" style={{ background: 'var(--primary)', color: 'white', padding: '10px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700 }}>Verify</button>
        </form>

        {message && <p style={{ marginTop: 12, color: 'var(--muted)' }}>{message}</p>}
      </div>
    </div>
  );
}
