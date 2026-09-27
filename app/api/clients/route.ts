import { NextResponse } from 'next/server';
import { requireProducer } from '@/lib/api-guard';
import { createClient } from '@/features/clients/actions/client.actions';
import { listClients } from '@/features/clients/services/clients.service';

export async function GET() {
  const { user, error } = await requireProducer();
  if (error || !user) return error ?? NextResponse.json({ error: 'Authentification requise.' }, { status: 401 });

  try {
    const clients = user.producerId ? await listClients(user.producerId) : [];
    return NextResponse.json({ clients });
  } catch {
    return NextResponse.json({ clients: [], error: 'Erreur chargement clients.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const res = await createClient(await req.json());
    if (!res.success) {
      const status = /connect|Authentification/i.test(res.error) ? 401 : /producteur|autoris/i.test(res.error) ? 403 : 400;
      return NextResponse.json({ error: res.error }, { status });
    }
    return NextResponse.json({ client: res.data });
  } catch {
    return NextResponse.json({ error: 'Erreur création client.' }, { status: 500 });
  }
}
