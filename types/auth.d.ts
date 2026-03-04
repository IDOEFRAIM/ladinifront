/**
 * Types d'authentification — Alignés avec le schema Drizzle
 */

/** System-level roles matching auth.role enum in Drizzle schema */
export type SystemRole = 'USER' | 'BUYER' | 'PRODUCER' | 'ADMIN' | 'SUPERADMIN' | 'AGENT';
/** @deprecated Use SystemRole instead */
export type Role = SystemRole;

export interface Location {
    lat: number;
    lng: number;
    address: string;
}

export interface User {
    id: string;
    email: string;
    role: SystemRole;
    name?: string;
    phone?: string;
    location?: Location;
    producerProfile?: {
        id: string;
        businessName: string;
        status: string;
        location?: { id: string; name: string } | null;
        region?: string;
    };
}

export interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    userRole: SystemRole | 'guest';
    
    login: (email: string, password: string) => Promise<any>;
    register: (data: {
        email: string;
        password: string;
        role: SystemRole;
        name: string;
        adminSecret?: string;
        locationId?: string;
    }) => Promise<any>;
    logout: () => void;
    
    isLoading: boolean;
    error: string | null;
}