import { FaSpinner, FaSearch } from 'react-icons/fa';

export const LoadingScreen = () => (
  <div className="h-screen flex flex-col items-center justify-center bg-[#F7F5EE]">
    <FaSpinner className="w-12 h-12 text-[#497A3A] animate-spin" />
    <p className="mt-4 text-[10px] font-black text-[#7C795D] uppercase tracking-[0.4em]">Synchronisation...</p>
  </div>
);

export const ErrorScreen = ({ onBack }: { onBack: () => void }) => (
  <div className="min-h-screen flex flex-col items-center justify-center p-10 bg-[#F7F5EE] text-center">
    <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center shadow-xl mb-6">
      <FaSearch className="text-stone-300 text-3xl" />
    </div>
    <h2 className="text-2xl font-black text-[#5B4636] uppercase tracking-tighter">Inconnu</h2>
    <p className="text-[#A4A291] text-[10px] font-bold uppercase mt-2 mb-8 max-w-50">
      Cette référence n'existe plus dans le flux logistique.
    </p>
    <button 
      onClick={onBack} 
      className="bg-[#5B4636] text-white px-10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-2xl active:scale-95 transition-all"
    >
      Retour aux ventes
    </button>
  </div>
);
