import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const { fetchClients } = await import('@/app/actions/clients.server');
        const clients = await fetchClients();
        return NextResponse.json({ clients });
    } catch (error) {
        return NextResponse.json({ clients: [], error: 'Erreur chargement clients.' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const data = await req.json();
        const { createClient } = await import('@/app/actions/clients.server');
        const client = await createClient(data);
        return NextResponse.json({ client });
    } catch (error) {
        return NextResponse.json({ error: 'Erreur création client.' }, { status: 500 });
    }
}
