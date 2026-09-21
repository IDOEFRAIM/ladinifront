// components/Market/FilterSidebar.tsx

import React, { useState } from 'react';

// Les catégories seront définies par le Service Catalogue
const categories = ['Céréales', 'Légumineuses', 'Fruits', 'Épices', 'Élevage'];

interface FilterSidebarProps {
    onFilterChange: (filters: { category: string, minPrice: number }) => void;
}

export default function FilterSidebar({ onFilterChange }: FilterSidebarProps) {
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [minPrice, setMinPrice] = useState<number>(0);

    const handleApplyFilters = () => {
        onFilterChange({ category: selectedCategory, minPrice });
    };

    return (
        <div className="w-full md:w-[250px] md:min-w-[250px] md:shrink-0 border-b md:border-b-0 md:border-r border-[#e0e0e0] p-4 md:p-5 box-border">
            <h3 style={{ marginBottom: '20px', color: '#333' }}>Filtres du Marché</h3>

            {/* Filtre Catégorie */}
            <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>Catégorie</label>
                <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                >
                    <option value="">Toutes les catégories</option>
                    {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                    ))}
                </select>
            </div>

            {/* Filtre Prix Minimum */}
            <div style={{ marginBottom: '25px' }}>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>Prix Minimum (XOF)</label>
                <input
                    type="number"
                    value={minPrice}
                    onChange={(e) => setMinPrice(Number(e.target.value))}
                    placeholder="0"
                    min="0"
                    style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                />
            </div>

            <button
                onClick={handleApplyFilters}
                style={{
                    width: '100%',
                    padding: '10px',
                    backgroundColor: '#0070f3',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                }}
            >
                Appliquer les Filtres
            </button>
        </div>
    );
}