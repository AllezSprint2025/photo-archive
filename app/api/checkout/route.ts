import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createServiceClient } from '@/lib/supabase';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-02-25.clover' });

export async function POST(req: NextRequest) {
  try {
    const { email, purchaseType, albumId, photoId, promoCode } = await req.json();
    if (!email || !purchaseType || !albumId) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });

    const supabase = createServiceClient();
    const { data: album, error: albumError } = await supabase.from('albums').select('*').eq('id', albumId).eq('published', true).single();
    if (albumError || !album) return NextResponse.json({ error: 'Album not found' }, { status: 404 });

    let photo = null;
    if (purchaseType === 'single') {
      if (!photoId) return NextResponse.json({ error: 'Photo ID required' }, { status: 400 });
      const { data: photoData, error: photoError } = await supabase.from('photos').select('*').eq('id', photoId).eq('album_id', albumId).single();
      if (photoError || !photoData) return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
      photo = photoData;
    }

    let unitAmount = purchaseType === 'album' ? album.price_album : album.price_single;
    let promoCodeRecord = null;

    if (promoCode) {
      const { data: promoData } = await supabase.from('promo_codes').select('*').eq('code', promoCode.toUpperCase()).eq('active', true).single();
      if (promoData) {
        const notExpired = !promoData.expires_at || new Date(promoData.expires_at) > new Date();
        const hasUses = promoData.max_uses === null || promoData.use_count < promoData.max_uses;
        if (notExpired && hasUses) {
          unitAmount = unitAmount - Math.floor((unitAmount * promoData.discount_percent) / 100);
          promoCodeRecord = promoData;
        }
      }
    }

    if (unitAmount < 50) unitAmount = 50;
    const itemName = purchaseType === 'album' ? `${album.title} — Full Album` : `${album.title} — ${photo?.title || 'Single Photo'}`;
    const siteUrl = process.env.SITE_URL || 'http://localhost:3000';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: email,
      line_items: [{ price_data: { currency: 'usd', product_data: { name: itemName, description: 'FoculPoint Photography — Digital Download' }, unit_amount: unitAmount }, quantity: 1 }],
      metadata: { email, purchaseType, albumId, photoId: photoId || '', promoCode: promoCodeRecord?.code || '', amountPaid: String(unitAmount) },
      success_url: `${siteUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/gallery/${album.slug}`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 });
  }
}
