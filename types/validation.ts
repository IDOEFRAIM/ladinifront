export type ValidationType = 'producer' | 'product' | 'update';
export type ValidationPriority = 'high' | 'medium' | 'low';
export type ValidationStatus = 'pending' | 'resolved' | 'rejected';

export interface ValidationItem {
    id: string;              // Identifiant court (ex: VAL-772)
    entityId: string;        // ID de l'objet lié (Producteur ou Produit)
    type: ValidationType;    // Nature de l'alerte
    title: string;           // Nom principal (ex: "Tomate Roma")
    producerName: string;    // Contexte métier (ex: "Coopérative Bobo")
    submissionDate: string;  // Timestamp ISO
    priority: ValidationPriority;
    status: ValidationStatus;
    
    // --- MÉTADONNÉES CRITIQUES POUR L'ACTION ---
    metadata?: {
        value?: number;      // Valeur financière en jeu (FCFA)
        quantity?: string;   // Volume à valider (ex: "500kg")
        documentUrl?: string; // Preuve (Photo d'identité ou certificat)
        riskLevel?: 'safe' | 'warning' | 'critical';
    };
}