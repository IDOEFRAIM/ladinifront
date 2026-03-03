import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const clients = await prisma.client.findMany({
            orderBy: { createdAt: 'desc' }
        });
        return NextResponse.json({ clients });
    } catch (error) {
        return NextResponse.json({ clients: [], error: 'Erreur chargement clients.' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const data = await req.json();
        const client = await prisma.client.create({ data });
        return NextResponse.json({ client });
    } catch (error) {
        return NextResponse.json({ error: 'Erreur création client.' }, { status: 500 });
    }
}
