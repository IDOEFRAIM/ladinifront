import { NextResponse } from 'next/server';
import { db, schema } from '@/src/db';
import { eq } from 'drizzle-orm';
import { getSessionFromRequest } from '@/lib/session';
import { buildAccessContext } from '@/lib/access-context';
import { AccessManager } from '@/lib/access-manager';
import { PERMISSIONS } from '@/lib/permissions';
import { uploadBufferToSupabase } from '@/lib/supabase.server';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';

export async function POST(req: Request) {
  const session = await getSessionFromRequest(req as any);
  if (!session || !session.userId) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const form = await req.formData();
  const distributionId = form.get('distributionId') as string | null;
  const file = form.get('file') as File | null;
  if (!distributionId || !file) return NextResponse.json({ error: 'missing' }, { status: 400 });

  const distRes = await db.select().from(schema.seedDistributions).where(eq(schema.seedDistributions.id, distributionId)).limit(1);
  const row = distRes[0];
  if (!row) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const ctx = await buildAccessContext(session.userId);
  const isProducer = ctx.producerId && ctx.producerId === row.producerId;
  if (!isProducer) {
    const authResp = AccessManager.can(ctx)
      .permission(PERMISSIONS.STOCK_VERIFY)
      .inOrg(row.organizationId)
      .inZone(row.zoneId)
      .toResponse();
    if (authResp) return authResp;
  }

  // save file: try Supabase then fallback to local FS
  try {
    const arrayBuffer = await (file as any).arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const remotePath = `cnib/${Date.now()}_${(file as any).name}`;
    try {
      const publicUrl = await uploadBufferToSupabase(remotePath, buffer, (file as any).type || undefined);
      await db.update(schema.seedDistributions).set({ metadata: { ...(row.metadata || {}), cnibUrl: publicUrl } }).where(eq(schema.seedDistributions.id, distributionId));
      return NextResponse.json({ ok: true, url: publicUrl });
    } catch (e) {
      // fallback to local disk
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'cnib');
      await mkdir(uploadDir, { recursive: true });
      const fileName = `${Date.now()}_${(file as any).name}`;
      await writeFile(path.join(uploadDir, fileName), buffer);
      const publicPath = `/uploads/cnib/${fileName}`;
      await db.update(schema.seedDistributions).set({ metadata: { ...(row.metadata || {}), cnibUrl: publicPath } }).where(eq(schema.seedDistributions.id, distributionId));
      return NextResponse.json({ ok: true, url: publicPath });
    }
  } catch (err: any) {
    console.error('CNIB upload failed', err);
    return NextResponse.json({ error: 'upload_failed' }, { status: 500 });
  }
}
