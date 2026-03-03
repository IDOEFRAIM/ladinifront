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
        const res = await axios.get(`${getBaseUrl()}/api/publicProduct/filters`);
        const data = res.data;
            // Utilise les locations dynamiques (id/name) depuis la DB
            const locations: { id: string, name: string, code: string }[] = data.locations || [];
            
            const mappedLocations = locations.map(l => ({
                id: l.name, // On utilise le nom comme filtre (correspond au champ location.name dans l'API produits)
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
        if (filters.category && filters.category !== 'all') params.append('category', filters.category);
        if (filters.region && filters.region !== 'all') params.append('region', filters.region);
        if (filters.searchQuery) params.append('search', filters.searchQuery);

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
        // Important: Utilisation de l'URL absolue via getBaseUrl() pour le serveur
        const response = await axios.get(`${getBaseUrl()}/api/publicProduct/${id}`);
        return response.data || null;
    } catch (error) {
        console.error(`Erreur getProductById (${id}):`, error);
        return null;
    }
};