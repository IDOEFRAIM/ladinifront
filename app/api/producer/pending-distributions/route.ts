import { NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/session';
import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(req: Request) {
  try {
    const session = await getSessionFromRequest(req as any);
    if (!session?.userId) {
      return NextResponse.json({ distributions: [] });
    }

    const producer = await db.query.producers.findFirst({
      where: eq(schema.producers.userId, session.userId),
      columns: { id: true },
    });

    if (!producer) {
      return NextResponse.json({ distributions: [] });
    }

    const rows = await db.query.seedDistributions.findMany({
      where: and(
        eq(schema.seedDistributions.producerId, producer.id),
        eq(schema.seedDistributions.status, 'PENDING'),
      ),
      orderBy: (t, ops) => [ops.desc(t.createdAt)],
      limit: 10,
      with: {
        allocation: { columns: { seedType: true, unit: true } },
        agent: { columns: { id: true, name: true } },
      },
    });

    const distributions = rows.map((r: any) => ({
      id: r.id,
      seedType: r.allocation?.seedType ?? 'Semence',
      quantity: r.quantity,
      unit: r.allocation?.unit ?? 'KG',
      agentName: r.agent?.name ?? null,
      createdAt: r.createdAt?.toISOString?.() ?? null,
    }));

    return NextResponse.json({ distributions });
  } catch (err) {
    console.error('[producer/pending-distributions]', err);
    return NextResponse.json({ distributions: [] });
  }
}
