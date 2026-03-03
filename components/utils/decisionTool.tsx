import { FaExclamationTriangle, FaUser } from 'react-icons/fa';

// --- LE VERIFICATEUR DE PRIX (Brouillon à tester) ---
export const PriceComparisonCard = ({ current, reference }: { current: number, reference: number }) => {
    const diff = ((current - reference) / reference) * 100;
    const isWarning = diff > 20;

    return (
        <div className={`p-4 rounded-2xl border ${isWarning ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-100'}`}>
            <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-gray-500 uppercase">Analyse du prix</span>
                {isWarning && <span className="text-[10px] font-black text-red-600 animate-bounce">ALERTE +{diff.toFixed(0)}%</span>}
            </div>
            <div className="flex items-end gap-2">
                <span className="text-2xl font-black text-gray-900">{current.toLocaleString()} F</span>
                <span className="text-xs text-gray-400 mb-1">vs {reference.toLocaleString()} F (Marché)</span>
            </div>
        </div>
    );
};

// --- LA TIMELINE D'AUDIT (Brouillon visuel) ---
export const MiniAuditTimeline = ({ logs }: { logs: any[] }) => (
    <div className="space-y-4 border-l-2 border-gray-100 ml-2 pl-4 mt-4">
        {logs.map((log, i) => (
            <div key={i} className="relative">
                <div className="absolute -left-[21px] top-1 w-2 h-2 rounded-full bg-green-500 shadow-[0_0_0_3px_white]" />
                <p className="text-xs font-bold text-gray-800">{log.action}</p>
                <p className="text-[10px] text-gray-400 italic">Par {log.admin} • {log.date}</p>
            </div>
        ))}
    </div>
);