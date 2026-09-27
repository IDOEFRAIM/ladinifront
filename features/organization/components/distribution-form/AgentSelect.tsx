'use client';

import { Users } from 'lucide-react';
import type { MemberOption } from '@/features/organization/components/distribution-form/distribution-form.types';

interface Props {
  members: MemberOption[];
  value: string;
  onChange: (userId: string) => void;
}

export default function AgentSelect({ members, value, onChange }: Props) {
  return (
    <div>
      <label className="flex items-center gap-2 text-xs font-bold text-stone-500 uppercase tracking-wide mb-2">
        <Users size={14} /> Agent assigné (optionnel)
      </label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2.5 border border-stone-300 rounded-lg bg-white text-stone-900 focus:ring-2 focus:ring-emerald-500 outline-none"
      >
        <option value="">Moi-même (agent connecté)</option>
        {members.map(m => (
          <option key={m.userId} value={m.userId}>
            {m.userName || m.email || m.userId} — {m.orgRole}
          </option>
        ))}
      </select>
    </div>
  );
}
