import { FaUser } from 'react-icons/fa';

interface AuditEntry {
  date: string;
  action: string;
  admin: string;
}

const AuditTimeline = ({ logs }: { logs: AuditEntry[] }) => (
    <div className="relative pl-8 space-y-8 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-100">
        {logs.map((log, i) => (
            <div key={i} className="relative group">
                {/* Point de la Timeline */}
                <div className={`absolute -left-[27px] w-4 h-4 rounded-full border-4 border-white shadow-sm transition-colors ${
                    i === 0 ? 'bg-emerald-500 scale-125' : 'bg-slate-300'
                }`} />
                
                <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none mb-1">
                        {log.date}
                    </span>
                    <span className="text-sm font-bold text-slate-900">
                        {log.action}
                    </span>
                    <span className="text-[11px] text-slate-500 flex items-center gap-1 mt-1">
                        <FaUser className="text-[10px]" /> {log.admin}
                    </span>
                </div>
            </div>
        ))}
    </div>
);

export default AuditTimeline;