/**
 * Types d'authentification — Alignés avec le schema Prisma
 */
import type { Role as PrismaSystemRole } from '@prisma/client';

export type SystemRole = PrismaSystemRole;
/** @deprecated Use SystemRole instead */
export type Role = PrismaSystemRole;

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