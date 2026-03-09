import { Product, ProductFilters } from '@/types/catalogue';
import axios from 'axios';

export type Category = {
    key: string;
    name: string;
    icon?: string;
};

const CATEGORIES_CONFIG: Category[] = [
    { key: 'cereales', name: 'Céréales & Grains', icon: '🌾' },
    { key: 'legumes', name: 'Légumes', icon: '🥕' },
    { key: 'animaux', name: 'Animaux', icon: '🐂' },
    { key: 'transforme', name: 'Transformé', icon: '📦' },
    { key: 'outils', name: 'Outils', icon: '🚜' },
];

// Utilitaire pour obtenir l'URL de base (nécessaire pour le côté serveur)
const getBaseUrl = () => {
    if (typeof window !== 'undefined') return ''; // Navigateur : URL relative OK
    if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`; // Vercel
    return 'http://localhost:3000'; // Développement local
};

export const getCategories = async (): Promise<Category[]> => {
    try {
        if (typeof window === 'undefined') {
            const mod = await import('@/app/actions/publicProduct.server');
            const data = await mod.fetchFiltersServer();
            const dbCategories: string[] = data.categories || [];
            const mappedCategories = dbCategories.map(catLabel => {
                const existing = CATEGORIES_CONFIG.find(c => 
                    c.name.toLowerCase() === catLabel.toLowerCase() || 
                    catLabel.toLowerCase().includes(c.key)
                );
                return {
                    key: catLabel,
                    name: catLabel,
                    icon: existing?.icon || '📦'
                };
            });
            return [{ key: 'all', name: 'Toutes les Catégories', icon: '🌍' }, ...mappedCategories];
        }

        const res = await axios.get(`${getBaseUrl()}/api/publicProduct/filters`);
        const data = res.data;
            const dbCategories: string[] = data.categories || [];
            
            // Mapper les catégories DB avec les icônes si possible, sinon icône par défaut
            const mappedCategories = dbCategories.map(catLabel => {
                // Essayer de trouver une config existante pour l'icône (très basique)
                const existing = CATEGORIES_CONFIG.find(c => 
                    c.name.toLowerCase() === catLabel.toLowerCase() || 
                    catLabel.toLowerCase().includes(c.key)
                );
                return {
                    key: catLabel, // On utilise le label comme key pour le filtre API exact
                    name: catLabel,
                    icon: existing?.icon || '📦'
                };
            });

            return [{ key: 'all', name: 'Toutes les Catégories', icon: '🌍' }, ...mappedCategories];
    } catch (e) {
        console.error("Failed to fetch real categories", e);
        // Fallback
        return [{ key: 'all', name: 'Toutes les Catégories', icon: '🌍' }, ...CATEGORIES_CONFIG];
    }
};

export const getRegions = async (): Promise<{ id: string, name: string }[]> => {
    try {
        if (typeof window === 'undefined') {
            const mod = await import('@/app/actions/publicProduct.server');
            const data = await mod.fetchFiltersServer();
            const locations: { id: string, name: string }[] = data.locations || [];
            const mappedLocations = locations.map(l => ({ id: String(l.name || l.id).trim(), name: l.name }));
            return [{ id: 'all', name: 'Réseau National' }, ...mappedLocations];
        }

        const res = await axios.get(`${getBaseUrl()}/api/publicProduct/filters`);
        const data = res.data;
            const locations: { id: string, name: string, code: string }[] = data.locations || [];
            
            const mappedLocations = locations.map(l => ({
                id: String(l.name || l.id).trim(), // Normaliser: utiliser le nom si présent, sinon l'id
                name: l.name
            }));

            return [{ id: 'all', name: 'Réseau National' }, ...mappedLocations];
    } catch (e) {
        console.error("Failed to fetch real locations", e);
    }
    return [{ id: 'all', name: 'Réseau National' }];
};

/**
 * Récupère les produits (Utilisé par le Catalogue - Client Side)
 */
export const getProducts = async (filters: ProductFilters = {}): Promise<Product[]> => {
    try {
        const params = new URLSearchParams();
        if ((filters as any).category && (filters as any).category !== 'all') params.append('category', (filters as any).category);
        if ((filters as any).region && (filters as any).region !== 'all') params.append('region', (filters as any).region);
        // Support both `searchQuery` (older code) and `search` (client uses `search` key)
        const searchValue = (filters as any).searchQuery ?? (filters as any).search;
        if (searchValue && String(searchValue).trim()) params.append('search', String(searchValue).trim());

        if (typeof window === 'undefined') {
            const mod = await import('@/app/actions/publicProduct.server');
            const data = await mod.fetchProductsServer({
                category: (filters as any).category,
                region: (filters as any).region,
                search: searchValue
            });
            return data || [];
        }

        const response = await axios.get(`${getBaseUrl()}/api/publicProduct?${params.toString()}`);
        return response.data || [];
    } catch (error) {
        console.error("Erreur getProducts:", error);
        return [];
    }
};

/**
 * Récupère un produit par ID (Utilisé par la Page Détail - Server Side)
 */
export const getProductById = async (id: string): Promise<Product | null> => {
    try {
        // Server-side: prefer direct DB query to avoid internal HTTP auth issues
        if (typeof window === 'undefined') {
            const { db } = await import('@/src/db');
            const schema = await import('@/src/db/schema');
            const drizzle = await import('drizzle-orm');

            const product = await db.query.products.findFirst({
                where: drizzle.eq(schema.products.id, id),
                with: {
                    producer: {
                        with: {
                            user: {
                                columns: {
                                    name: true,
                                    phone: true,
                                }
                            }
                        }
                    }
                }
            });

            if (!product) return null;

            const producer = product.producer ?? null;
            const producerUser = producer?.user ?? null;

            const formattedProduct = {
                id: product.id,
                producerId: product.producerId || producer?.id || '',
                name: product.name || 'Produit',
                category: product.categoryLabel || '',
                categoryLabel: product.categoryLabel || '',
                price: product.price ?? 0,
                unit: product.unit ?? '',
                quantity: product.quantityForSale ?? 0,
                stock: product.quantityForSale ?? 0,
                description: product.description || '',
                images: Array.isArray(product.images) ? product.images : [],
                audioUrl: product.audioUrl || null,
                status: (product.quantityForSale ?? 0) > 0 ? 'active' : 'sold_out',
                location: {
                    address: producer ? [producer.commune, producer.region].filter(Boolean).join(', ') : 'Localisation inconnue',
                    latitude: 0,
                    longitude: 0
                },
                producer: {
                    name: producer?.businessName || producerUser?.name || 'Producteur',
                    location: producer ? [producer.commune, producer.region].filter(Boolean).join(', ') : '',
                    phone: producerUser?.phone || null
                },
                createdAt: product.createdAt,
                updatedAt: product.updatedAt
            };

            return formattedProduct as Product;
        }

        // Client-side fallback: call public API route
        const response = await axios.get(`${getBaseUrl()}/api/publicProduct/${id}`);
        return response.data || null;
    } catch (error) {
        console.error(`Erreur getProductById (${id}):`, error);
        return null;
    }
};