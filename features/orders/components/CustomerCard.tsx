// @/components/orders/CustomerCard.tsx
import { FaUser, FaMapMarkerAlt, FaPhone, FaWhatsapp } from 'react-icons/fa';
import Link from 'next/link';

interface CustomerProps {
  name: string;
  location: string;
  phone: string;
}

export const CustomerCard = ({ name, location, phone }: CustomerProps) => (
  <div className="bg-white rounded-[2.5rem] p-6 border border-slate-100 shadow-sm">
    <h3 className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em] mb-4">Destination</h3>
    <div className="flex items-center gap-4 mb-6">
      <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center text-white font-black text-xl italic shadow-lg">
        {name.charAt(0)}
      </div>
      <div>
        <p className="font-black text-slate-900 italic uppercase leading-tight">{name}</p>
        <p className="text-[10px] font-bold text-slate-400 flex items-center gap-1 uppercase tracking-tight">
          <FaMapMarkerAlt size={10} /> {location}
        </p>
      </div>
    </div>
    <div className="flex gap-2">
      <button 
        onClick={() => window.location.href = `tel:${phone}`}
        className="flex-1 bg-green-600 text-white py-4 rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-green-100"
      >
        <FaPhone size={10} /> <span className="text-[10px] font-black uppercase tracking-widest">Appeler</span>
      </button>
      <Link 
        href={`https://wa.me/${phone.replace(/\s/g, '')}`} 
        className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center text-green-600 active:scale-95 transition-all border border-slate-200"
      >
        <FaWhatsapp size={20} />
      </Link>
    </div>
  </div>
);