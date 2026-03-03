import { cookies } from 'next/headers';
import { getSessionFromRequest } from '@/lib/session';

/**
 * Returns the userId from the signed JWT session token.
 * No legacy cookie fallback — JWT (`session-token`) is the sole auth source.
 */
async function getUserIdFromSession(): Promise<string | undefined> {
    const cookieStore = await cookies();
    const session = await getSessionFromRequest({ cookies: cookieStore } as any);
    return session?.userId;
}

export default getUserIdFromSession;