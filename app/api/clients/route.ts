import { NextResponse } from 'next/server';
import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { desc } from 'drizzle-orm';

export async function GET() {
    try {
        const clients = await db.query.clients.findMany({
            orderBy: (t, ops) => [ops.desc(t.createdAt)],
        });
        return NextResponse.json({ clients });
    } catch (error) {
        return NextResponse.json({ clients: [], error: 'Erreur chargement clients.' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const data = await req.json();
        const [client] = await db.insert(schema.clients).values(data).returning();
        return NextResponse.json({ client });
    } catch (error) {
        return NextResponse.json({ error: 'Erreur création client.' }, { status: 500 });
    }
}
