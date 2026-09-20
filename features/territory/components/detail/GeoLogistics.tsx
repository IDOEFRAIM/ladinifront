'use client';

import { FaMapMarkerAlt } from 'react-icons/fa';

export function GeoLogistics({ zone, isEditing, form, setForm }: any) {
  return (
    <div className="lg:col-span-1 space-y-8">
      <div className="bg-white rounded-4xl border-2 border-stone-100 p-8">
        <h3 className="text-xs font-black text-stone-900 uppercase tracking-[0.2em] mb-8 border-l-4 border-green-800 pl-4">Géolocalisation</h3>
        <div className="space-y-4 mb-8">
          <div className="flex justify-between items-center p-4 bg-stone-50 rounded-2xl">
            <span className="text-[10px] font-black text-stone-400 uppercase tracking-tighter">Latitude</span>
            {isEditing ? (
              <input type="number" value={form.latitude} onChange={e => setForm({...form, latitude: e.target.value})} className="w-24 text-right bg-white border-2 border-stone-100 rounded-lg px-2 py-1 text-sm font-black" />
            ) : (
              <span className="font-black text-stone-800">{zone.latitude ?? '—'}</span>
            )}
          </div>
          <div className="flex justify-between items-center p-4 bg-stone-50 rounded-2xl">
            <span className="text-[10px] font-black text-stone-400 uppercase tracking-tighter">Longitude</span>
            {isEditing ? (
              <input type="number" value={form.longitude} onChange={e => setForm({...form, longitude: e.target.value})} className="w-24 text-right bg-white border-2 border-stone-100 rounded-lg px-2 py-1 text-sm font-black" />
            ) : (
              <span className="font-black text-stone-800">{zone.longitude ?? '—'}</span>
            )}
          </div>
        </div>
        <div className="aspect-square bg-stone-100 rounded-4xl border-4 border-white shadow-inner flex flex-col items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 grayscale" style={{backgroundImage: 'url("https://www.transparenttextures.com/patterns/cubes.png")'}} />
          <div className="relative z-10 flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-green-700/30 animate-pulse flex items-center justify-center">
              <FaMapMarkerAlt className="text-green-800 text-2xl" />
            </div>
            <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Map Engine Active</p>
          </div>
        </div>
      </div>
    </div>
  );
}
