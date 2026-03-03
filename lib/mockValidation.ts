import { ValidationItem } from "@/types/validation";

export const mockValidations: ValidationItem[] = [
    {
        id: 'VAL-772',
        entityId: 'PROD-002',
        type: 'producer',
        title: 'Coopérative des Niayes',
        producerName: 'Dossier : KYC Nouveau Membre',
        submissionDate: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // Il y a 30 min
        priority: 'high',
        status: 'pending',
        metadata: {
            documentUrl: '/docs/id-card-niayes.pdf',
            riskLevel: 'safe'
        }
    },
    {
        id: 'VAL-801',
        entityId: 'ITM-004',
        type: 'product',
        title: 'Oignon Jaune (Gros Calibre)',
        producerName: 'Ferme Alpha • Stock Urgent',
        submissionDate: new Date(Date.now() - 1000 * 60 * 120).toISOString(), // Il y a 2h
        priority: 'medium',
        status: 'pending',
        metadata: {
            quantity: '2.5 Tonnes',
            value: 850000,
            riskLevel: 'safe'
        }
    },
    {
        id: 'VAL-943',
        entityId: 'PROD-001',
        type: 'update',
        title: 'Changement RIB / Mobile Money',
        producerName: 'Moussa Traoré • Alerte Sécurité',
        submissionDate: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), // Il y a 5h
        priority: 'high',
        status: 'pending',
        metadata: {
            riskLevel: 'warning'
        }
    },
    {
        id: 'VAL-102',
        entityId: 'ITM-088',
        type: 'product',
        title: 'Engrais NPK 15-15-15',
        producerName: 'Agro-Supply • Certificat Phytosanitaire',
        submissionDate: '2025-12-16T08:00:00Z',
        priority: 'low',
        status: 'resolved',
        metadata: {
            quantity: '100 Sacs',
            riskLevel: 'safe'
        }
    }
];