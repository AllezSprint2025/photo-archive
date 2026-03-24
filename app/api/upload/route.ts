import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';

function checkAdminAuth(req: NextRequest): boolean {
  return req.headers.get('x-admin-password') === process.env.ADMIN_PASSWORD;
}

export async function POST(req: NextRequest) {
  if (!checkAdminAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const albumId = formData.get('albumId') as string | null;
    if (!file || !albumId) return NextResponse.json({ error: 'Missing file or albumId' }, { status: 400 });

    const supabase = createServiceClient();
    const { data: album } = await supabase.from('albums').select('id').eq('id', albumId).single();
    if (!album) return NextResponse.json({ error: 'Album not found' }, { status: 404 });

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const photoId = uuidv4();
    const originalPath = `originals/${albumId}/${photoId}.jpg`;
    const watermarkedPath = `watermarked/${albumId}/${photoId}.jpg`;

    const originalProcessed = await sharp(fileBuffer).jpeg({ quality: 95, progressive: true }).toBuffer();
    const { error: origError } = await supabase.storage.from('photos').upload(originalPath, originalProcessed, { contentType: 'image/jpeg', upsert: false });
    if (origError) return NextResponse.json({ error: `Upload failed: ${origError.message}` }, { status: 500 });

    const metadata = await sharp(fileBuffer).metadata();
    const imgWidth = metadata.width || 1200;
    const imgHeight = metadata.height || 800;
    const fontSize = Math.max(24, Math.min(60, Math.floor(imgWidth / 20)));
    const textWidth = Math.floor(fontSize * 22);
    const textHeight = Math.floor(fontSize * 1.5);

    const watermarkSvg = Buffer.from(`<svg width="${imgWidth}" height="${imgHeight}" xmlns="http://www.w3.org/2000/svg">
      <defs><style>.wm{font-family:Georgia,serif;font-size:${fontSize}px;fill:rgba(255,255,255,0.45);font-style:italic;letter-spacing:2px;}</style></defs>
      <rect x="${Math.floor((imgWidth - textWidth) / 2) - 20}" y="${Math.floor((imgHeight - textHeight) / 2) - 10}" width="${textWidth + 40}" height="${textHeight + 20}" fill="rgba(0,0,0,0.25)" rx="4"/>
      <text class="wm" x="50%" y="50%" dominant-baseline="middle" text-anchor="middle">© FoculPoint Photography</text>
    </svg>`);

    const watermarkedBuffer = await sharp(fileBuffer)
      .resize({ width: Math.min(imgWidth, 1600), withoutEnlargement: true })
      .composite([{ input: watermarkSvg, gravity: 'center', blend: 'over' }])
      .jpeg({ quality: 82, progressive: true }).toBuffer();

    const { error: wmError } = await supabase.storage.from('photos').upload(watermarkedPath, watermarkedBuffer, { contentType: 'image/jpeg', upsert: false });
    if (wmError) { await supabase.storage.from('photos').remove([originalPath]); return NextResponse.json({ error: `Watermark failed: ${wmError.message}` }, { status: 500 }); }

    const { count } = await supabase.from('photos').select('*', { count: 'exact', head: true }).eq('album_id', albumId);
    const { data: photoRecord, error: insertError } = await supabase.from('photos').insert({
      id: photoId, album_id: albumId,
      title: file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '),
      storage_path: originalPath, watermarked_path: watermarkedPath, sort_order: count || 0,
    }).select().single();

    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });
    return NextResponse.json({ photo: photoRecord });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Upload failed' }, { status: 500 });
  }
}
