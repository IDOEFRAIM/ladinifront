'use client';

import { Product } from '@/features/products/types/product.types';
import { THEME } from '@/features/products/components/view/product-view.theme';
import { IconArrowLeft, IconChevronRight } from '@/features/products/components/view/ProductIcons';

export function NavigationBar({ product, router }: { product: Product, router: any }) {
    return (
        <nav style={{ borderBottom: `1px solid ${THEME.border}`, padding: '20px 5%', backgroundColor: THEME.surface }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', fontWeight: 600 }}>
                    <button 
                    onClick={() => router.back()}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', color: THEME.accent }}
                >
                    <IconArrowLeft size={16} /> RETOUR
                </button>
                <span style={{ color: THEME.border }}>|</span>
                <span style={{ color: THEME.muted }}>MARCHÉ</span>
                <IconChevronRight size={14} color={THEME.muted} />
                <span style={{ color: THEME.muted }}>{product.categoryLabel?.toUpperCase()}</span>
                <IconChevronRight size={14} color={THEME.muted} />
                <span style={{ color: THEME.secondary }}>{product.name}</span>
            </div>
        </nav>
    );
}
