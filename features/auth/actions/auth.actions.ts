'use server';

// Authentification — actions publiques (aucune session requise) mais validées par Zod.
// Le contrat historique { success, user } est encapsulé dans ApiResult : `result.data.user`.
import { z } from 'zod';
import { secureAction } from '@/lib/action-guard';
import { LoginSchema } from '@/lib/validators';
import * as svc from '@/features/auth/services/auth.service';

// Contrôle d'enveloppe uniquement : la validation complète (RegisterSchema / RegisterWithOrgSchema) est dans le service.
const registerArg = z.looseObject({
  phone: z.string().min(8).max(20),
  password: z.string().min(1).max(200),
  name: z.string().min(1).max(200),
});

export async function loginUser(credentials: Parameters<typeof svc.loginUser>[0]) {
  return secureAction({ public: true, schema: z.tuple([LoginSchema]) }, [credentials], async (c) => {
    const result = await svc.loginUser(c);
    return result.success && 'user' in result && result.user
      ? { success: true as const, data: { user: result.user } }
      : { success: false as const, error: 'error' in result && result.error ? result.error : 'Identifiants incorrects' };
  });
}

export async function registerUser(data: Parameters<typeof svc.registerUser>[0]) {
  return secureAction({ public: true, schema: z.tuple([registerArg]) }, [data], async (d) => {
    const result = await svc.registerUser(d);
    return result.success && 'user' in result && result.user
      ? { success: true as const, data: { user: result.user, pendingOrgCreated: 'pendingOrgCreated' in result && !!result.pendingOrgCreated } }
      : { success: false as const, error: 'error' in result && result.error ? result.error : "Erreur lors de l'inscription" };
  });
}

export async function logoutUser() {
  return secureAction({ public: true, schema: z.tuple([]) }, [], svc.logoutUser);
}
