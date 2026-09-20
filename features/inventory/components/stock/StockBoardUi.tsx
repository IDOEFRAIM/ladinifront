'use client';

import { FaTrash } from 'react-icons/fa';

export function TabButton({ active, onClick, icon: Icon, label, color }: any) {
    const activeClass = active 
        ? `bg-${color}-50 text-${color}-600 shadow-sm` 
        : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50';
    
    // Tailwind dynamic classes workaround (safelist these or use style)
    // For simplicity, let's use specific classes based on color prop logic
    let colorClass = '';
    if (active) {
        if (color === 'green') colorClass = 'bg-green-50 text-green-600';
        if (color === 'blue') colorClass = 'bg-blue-50 text-blue-600';
        if (color === 'orange') colorClass = 'bg-orange-50 text-orange-600';
    } else {
        colorClass = 'text-slate-400 hover:text-slate-600 hover:bg-slate-50';
    }

    return (
        <button 
            onClick={onClick}
            className={`flex items-center gap-2 px-6 py-3 rounded-[1.2rem] transition-all duration-300 ${colorClass}`}
        >
            <Icon size={14} />
            <span className="text-[10px] font-black uppercase tracking-wider">{label}</span>
        </button>
    );
}

export function Modal({ title, children, onClose }: any) {
    return (
        <div className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl w-full max-w-md animate-in zoom-in-95 max-h-[90vh] overflow-y-auto custom-scrollbar">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-black uppercase italic text-slate-900">{title}</h3>
                    <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors">
                        <FaTrash size={10} className="rotate-45" /> {/* Using trash icon as close X for style */}
                    </button>
                </div>
                {children}
            </div>
        </div>
    );
}
