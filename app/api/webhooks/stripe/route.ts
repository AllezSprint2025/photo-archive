import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createServiceClient } from '@/lib/supabase';
import { Resend } from 'resend';
import { v4 as uuidv4 } from 'uuid';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-02-25.clover' });
const resend = new Resend(process.env.RESEND_API_KEY!);

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');
  if (!signature) return NextResponse.json({ error: 'Missing signature' }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err: unknown) {
    return NextResponse.json({ error: `Webhook Error: ${err instanceof Error ? err.message : 'Unknown'}` }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const supabase = createServiceClient();
    const meta = session.metadata || {};
    const email = meta.email || session.customer_email || '';
    const purchaseType = meta.purchaseType as 'single' | 'album';
    const albumId = meta.albumId;
    const photoId = meta.photoId || null;
    const promoCode = meta.promoCode || null;
    const amountPaid = parseInt(meta.amountPaid || '0', 10);

    if (!email || !purchaseType || !albumId) return NextResponse.json({ received: true });

    const { data: existing } = await supabase.from('orders').select('id').eq('stripe_session_id', session.id).single();
    if (existing) return NextResponse.json({ received: true });

    const downloadToken = uuidv4();
    const tokenExpiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();

    const { data: order, error: orderError } = await supabase.from('orders').insert({
      email, album_id: albumId, photo_id: purchaseType === 'single' ? photoId : null,
      purchase_type: purchaseType, amount_paid: amountPaid, promo_code: promoCode,
      stripe_session_id: session.id, stripe_payment_intent: session.payment_intent as string || null,
      download_token: downloadToken, token_expires_at: tokenExpiresAt, download_count: 0, fulfilled: false,
    }).select().single();

    if (orderError) { console.error('Order error:', orderError); return NextResponse.json({ received: true }); }

    if (promoCode) await supabase.rpc('increment_promo_use', { promo_code: promoCode });

    const { data: album } = await supabase.from('albums').select('title').eq('id', albumId).single();
    const siteUrl = process.env.SITE_URL || 'http://localhost:3000';
    const downloadUrl = `${siteUrl}/download/${downloadToken}`;
    const fromEmail = process.env.FROM_EMAIL || 'noreply@foculpoint.com';
    const expires = new Date(tokenExpiresAt).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    try {
      await resend.emails.send({
        from: `FoculPoint Photography <${fromEmail}>`,
        to: email,
        subject: `Your Download is Ready — ${album?.title || 'FoculPoint Photography'}`,
        html: `<!DOCTYPE html><html><head><meta charset="UTF-8"/></head><body style="margin:0;padding:0;background:#0a0a0a;font-family:Georgia,serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 16px;"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#141414;border:1px solid #2a2a2a;border-radius:4px;overflow:hidden;">
<tr><td style="background:#0a0a0a;padding:32px;text-align:center;border-bottom:1px solid #2a2a2a;">
<p style="color:#c9a96e;font-size:11px;letter-spacing:4px;text-transform:uppercase;margin:0 0 8px 0;">FoculPoint Photography</p>
<h1 style="color:#f5f5f5;font-size:24px;font-weight:300;margin:0;">Your Download is Ready</h1></td></tr>
<tr><td style="padding:40px 32px;">
<p style="color:#9ca3af;font-size:15px;line-height:1.7;margin:0 0 24px 0;">Thank you for your purchase of <strong style="color:#f5f5f5;">${album?.title || 'your photos'}</strong>.</p>
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:8px 0 32px 0;">
<a href="${downloadUrl}" style="display:inline-block;background:linear-gradient(135deg,#c9a96e,#e8c98a);color:#0a0a0a;text-decoration:none;padding:14px 36px;font-size:13px;font-weight:700;letter-spacing:2px;text-transform:uppercase;border-radius:2px;">Download Now</a>
</td></tr></table>
<table width="100%" cellpadding="12" cellspacing="0" style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:2px;margin-bottom:24px;">
<tr><td style="color:#6b7280;font-size:12px;text-transform:uppercase;border-bottom:1px solid #2a2a2a;">Amount Paid</td><td style="color:#c9a96e;font-size:14px;font-weight:600;border-bottom:1px solid #2a2a2a;">$${(amountPaid / 100).toFixed(2)}</td></tr>
<tr><td style="color:#6b7280;font-size:12px;text-transform:uppercase;">Link Expires</td><td style="color:#f5f5f5;font-size:14px;">${expires}</td></tr>
</table>
<p style="color:#6b7280;font-size:12px;margin:0 0 8px 0;">If the button does not work, copy this link:</p>
<p style="word-break:break-all;margin:0;"><a href="${downloadUrl}" style="color:#c9a96e;font-size:12px;">${downloadUrl}</a></p>
</td></tr>
<tr><td style="padding:24px 32px;border-top:1px solid #2a2a2a;text-align:center;">
<p style="color:#6b7280;font-size:11px;margin:0;">&copy; ${new Date().getFullYear()} FoculPoint Photography. All rights reserved.</p>
</td></tr></table></td></tr></table></body></html>`,
      });
      await supabase.from('orders').update({ fulfilled: true }).eq('id', order.id);
    } catch (emailError) { console.error('Email error:', emailError); }
  }

  return NextResponse.json({ received: true });
}
