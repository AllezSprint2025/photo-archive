import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { code } = await req.json();
    if (!code) return NextResponse.json({ error: 'Code is required' }, { status: 400 });
    const supabase = createServiceClient();
    const { data: promo, error } = await supabase.from('promo_codes').select('id,code,discount_percent,max_uses,use_count,expires_at,active').eq('code', code.toUpperCase().trim()).eq('active', true).single();
    if (error || !promo) return NextResponse.json({ error: 'Invalid or inactive promo code' }, { status: 404 });
    if (promo.expires_at && new Date(promo.expires_at) < new Date()) return NextResponse.json({ error: 'This promo code has expired' }, { status: 400 });
    if (promo.max_uses !== null && promo.use_count >= promo.max_uses) return NextResponse.json({ error: 'This promo code has reached its limit' }, { status: 400 });
    return NextResponse.json(promo);
  } catch (err: unknown) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
