import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient, getSignedUrl } from '@/lib/supabase';

export async function GET(req: NextRequest, { params }: { params: { token: string } }) {
  try {
    const { token } = params;
    const photoId = req.nextUrl.searchParams.get('photoId');
    if (!token) return NextResponse.json({ error: 'Invalid token' }, { status: 400 });

    const supabase = createServiceClient();
    const { data: order, error: orderError } = await supabase.from('orders').select('*').eq('download_token', token).single();
    if (orderError || !order) return NextResponse.json({ error: 'Invalid download link' }, { status: 404 });
    if (new Date(order.token_expires_at) < new Date()) return NextResponse.json({ error: 'Download link has expired' }, { status: 410 });

    let storagePath: string | null = null;
    let filename = 'photo.jpg';

    if (order.purchase_type === 'album') {
      if (!photoId) return NextResponse.json({ error: 'Photo ID required' }, { status: 400 });
      const { data: photo } = await supabase.from('photos').select('*').eq('id', photoId).eq('album_id', order.album_id).single();
      if (!photo) return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
      storagePath = photo.storage_path;
      filename = `${photo.title || `photo-${photo.sort_order + 1}`}.jpg`;
    } else {
      const targetPhotoId = photoId || order.photo_id;
      if (!targetPhotoId) return NextResponse.json({ error: 'No photo found' }, { status: 400 });
      const { data: photo } = await supabase.from('photos').select('*').eq('id', targetPhotoId).single();
      if (!photo) return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
      storagePath = photo.storage_path;
      filename = `${photo.title || 'photo'}.jpg`;
    }

    if (!storagePath) return NextResponse.json({ error: 'Storage path not found' }, { status: 500 });

    await supabase.from('orders').update({ download_count: order.download_count + 1 }).eq('id', order.id);
    const signedUrl = await getSignedUrl('photos', storagePath, 300);
    const safeFilename = filename.replace(/[^a-z0-9._\- ]/gi, '_');
    return NextResponse.redirect(signedUrl, { headers: { 'Content-Disposition': `attachment; filename="${safeFilename}"` } });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Download failed' }, { status: 500 });
  }
}
