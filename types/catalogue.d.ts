import { Location } from './auth'; 

/**
 * Interface pour une fiche produit (Synchronisée avec Prisma)
 */
export interface Product {
    id: string;
    producerId: string;
    name: string;
    categoryLabel: string; 
    unit: string; 
    price: number; 
    quantityForSale?: number;
    // Champs legacy/compatibilité
    stock?: number;
    quantity?: number;
    images: string[];
    audioUrl?: string;
    description?: string;
    createdAt: Date;
    updatedAt: Date;
    
    // Jointure optionnelle si on récupère le producteur avec
    producer?: {
        name: string;
        location: string;
        phone?: string;
        zone?: { id: string; name: string } | null;
    };
}

/**
 * Interface pour les filtres de recherche
 */
export interface ProductFilters {
    category?: string;
    minPrice?: number;
    maxPrice?: number;
    region?: string; // Plus simple que l'objet Location pour les filtres d'URL
    searchQuery?: string;
    producerId?: string;
}