'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { supabase, getPublicUrl } from '@/lib/supabase';
import { Album, Photo, PromoCode } from '@/lib/types';
import Image from 'next/image';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

function PurchaseModal({ album, selectedPhoto, onClose }: { album: Album; selectedPhoto: Photo | null; onClose: () => void }) {
  const [purchaseType, setPurchaseType] = useState<'single' | 'album'>(selectedPhoto ? 'single' : 'album');
  const [email, setEmail] = useState('');
  const [promoInput, setPromoInput] = useState('');
  const [promo, setPromo] = useState<PromoCode | null>(null);
  const [promoError, setPromoError] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const basePrice = purchaseType === 'album' ? album.price_album : album.price_single;
  const discountAmount = promo ? Math.floor((basePrice * promo.discount_percent) / 100) : 0;
  const finalPrice = basePrice - discountAmount;

  const applyPromo = async () => {
    if (!promoInput.trim()) return;
    setPromoLoading(true); setPromoError('');
    try {
      const res = await fetch('/api/promo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: promoInput.trim() }) });
      const data = await res.json();
      if (!res.ok) { setPromoError(data.error || 'Invalid promo code'); setPromo(null); }
      else setPromo(data);
    } catch { setPromoError('Failed to apply promo code'); }
    finally { setPromoLoading(false); }
  };

  const handleCheckout = async () => {
    if (!email.trim() || !/^[^@]+@[^@]+\.[^@]+$/.test(email)) { setError('Please enter a valid email address'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email.trim(), purchaseType, albumId: album.id, photoId: purchaseType === 'single' ? selectedPhoto?.id : undefined, promoCode: promo?.code }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Checkout failed');
      const stripe = await stripePromise;
      if (!stripe) throw new Error('Stripe not loaded');
      if (data.url) window.location.href = data.url;
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Something went wrong'); setLoading(false); }
  };

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="card-dark w-full max-w-md p-6 sm:p-8 animate-fade-in">
        <div className="flex items-start justify-between mb-6">
          <div><h2 className="text-[#f5f5f5] text-xl font-light">Purchase</h2><p className="text-[#6b7280] text-sm mt-1">{album.title}</p></div>
          <button onClick={onClose} className="text-[#6b7280] hover:text-[#f5f5f5] p-1">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div className="flex gap-3 mb-6">
          <button onClick={() => setPurchaseType('album')} className={`flex-1 py-3 px-4 border rounded text-sm transition-all ${purchaseType === 'album' ? 'border-[#c9a96e] text-[#c9a96e] bg-[#c9a96e]/10' : 'border-[#2a2a2a] text-[#6b7280] hover:border-[#6b7280]'}`}>
            <div className="font-semibold">Full Album</div><div className="text-xs mt-0.5">${(album.price_album / 100).toFixed(2)}</div>
          </button>
          {selectedPhoto && (
            <button onClick={() => setPurchaseType('single')} className={`flex-1 py-3 px-4 border rounded text-sm transition-all ${purchaseType === 'single' ? 'border-[#c9a96e] text-[#c9a96e] bg-[#c9a96e]/10' : 'border-[#2a2a2a] text-[#6b7280] hover:border-[#6b7280]'}`}>
              <div className="font-semibold">Single Photo</div><div className="text-xs mt-0.5">${(album.price_single / 100).toFixed(2)}</div>
            </button>
          )}
        </div>
        <div className="mb-4">
          <label className="block text-xs tracking-wider uppercase text-[#6b7280] mb-2">Email Address</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="input-dark" />
          <p className="text-xs text-[#6b7280] mt-1">Download link will be sent here.</p>
        </div>
        <div className="mb-6">
          <label className="block text-xs tracking-wider uppercase text-[#6b7280] mb-2">Promo Code</label>
          <div className="flex gap-2">
            <input type="text" value={promoInput} onChange={(e) => setPromoInput(e.target.value.toUpperCase())} placeholder="SAVE20" className="input-dark" disabled={!!promo} />
            {promo ? (
              <button onClick={() => { setPromo(null); setPromoInput(''); }} className="btn-outline flex-shrink-0 px-3">Remove</button>
            ) : (
              <button onClick={applyPromo} disabled={promoLoading || !promoInput.trim()} className="btn-outline flex-shrink-0 px-3">{promoLoading ? <span className="spinner" /> : 'Apply'}</button>
            )}
          </div>
          {promoError && <p className="text-red-400 text-xs mt-1">{promoError}</p>}
          {promo && <p className="text-green-400 text-xs mt-1">{promo.discount_percent}% discount applied!</p>}
        </div>
        <div className="border border-[#2a2a2a] rounded p-4 mb-6 space-y-2 text-sm">
          <div className="flex justify-between text-[#9ca3af]"><span>Subtotal</span><span>${(basePrice / 100).toFixed(2)}</span></div>
          {promo && <div className="flex justify-between text-green-400"><span>Discount ({promo.discount_percent}%)</span><span>-${(discountAmount / 100).toFixed(2)}</span></div>}
          <div className="flex justify-between text-[#f5f5f5] font-semibold pt-2 border-t border-[#2a2a2a]"><span>Total</span><span className="text-[#c9a96e]">${(finalPrice / 100).toFixed(2)}</span></div>
        </div>
        {error && <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded text-red-300 text-sm">{error}</div>}
        <button onClick={handleCheckout} disabled={loading} className="btn-gold w-full py-3 flex items-center justify-center gap-2">
          {loading ? <><span className="spinner" /> Processing…</> : <>Proceed to Payment</>}
        </button>
        <p className="text-center text-xs text-[#6b7280] mt-3">Secured by Stripe · All sales final</p>
      </div>
    </div>
  );
}

export default function GalleryPage() {
  const { slug } = useParams<{ slug: string }>();
  const [album, setAlbum] = useState<Album | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [lightboxPhoto, setLightboxPhoto] = useState<Photo | null>(null);

  const fetchAlbum = useCallback(async () => {
    const { data: albumData } = await supabase.from('albums').select('*').eq('slug', slug).eq('published', true).single();
    if (!albumData) { setLoading(false); return; }
    setAlbum(albumData);
    const { data: photoData } = await supabase.from('photos').select('*').eq('album_id', albumData.id).order('sort_order', { ascending: true });
    setPhotos(photoData || []);
    setLoading(false);
  }, [slug]);

  useEffect(() => { fetchAlbum(); }, [fetchAlbum]);

  const getWatermarkedUrl = (photo: Photo) => getPublicUrl('photos', photo.watermarked_path || photo.storage_path);
  const openPurchase = (photo?: Photo) => { setSelectedPhoto(photo || null); setModalOpen(true); };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><span className="spinner" style={{ width: '2rem', height: '2rem' }} /></div>;
  if (!album) return <div className="min-h-screen flex items-center justify-center"><div className="text-center"><p className="text-[#f5f5f5] text-2xl mb-2">Collection not found</p><a href="/" className="text-[#c9a96e] text-sm hover:underline">← Back to Gallery</a></div></div>;

  return (
    <div className="min-h-screen pb-24">
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-8">
        <a href="/" className="text-[#6b7280] text-sm hover:text-[#c9a96e] transition-colors inline-flex items-center gap-1 mb-8">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
          All Collections
        </a>
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
          <div>
            <p className="text-[#c9a96e] text-xs tracking-[0.4em] uppercase mb-2">Collection</p>
            <h1 className="text-3xl sm:text-4xl font-light tracking-wide text-[#f5f5f5]">{album.title}</h1>
            {album.description && <p className="text-[#9ca3af] mt-3 max-w-xl leading-relaxed">{album.description}</p>}
          </div>
          <button onClick={() => openPurchase()} className="btn-gold flex-shrink-0">Buy Full Album — ${(album.price_album / 100).toFixed(2)}</button>
        </div>
        <hr className="divider mt-6" />
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {photos.length === 0 ? (
          <div className="text-center py-16 text-[#6b7280]"><p>No photos in this collection yet.</p></div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {photos.map((photo) => (
              <div key={photo.id} className="photo-card card-dark aspect-square cursor-pointer" onClick={() => setLightboxPhoto(photo)}>
                <Image src={getWatermarkedUrl(photo)} alt={photo.title || 'Photo'} fill className="object-cover" sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw" />
                <div className="overlay">
                  <div className="overlay-content w-full">
                    <div className="flex items-center justify-between">
                      <span className="text-[#f5f5f5] text-xs">{photo.title || `#${photo.sort_order + 1}`}</span>
                      <button onClick={(e) => { e.stopPropagation(); openPurchase(photo); }} className="btn-gold text-xs px-2 py-1">Buy ${(album.price_single / 100).toFixed(2)}</button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {lightboxPhoto && (
        <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4" onClick={() => setLightboxPhoto(null)}>
          <button onClick={() => setLightboxPhoto(null)} className="absolute top-4 right-4 text-[#9ca3af] hover:text-white p-2">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
          <div className="relative max-w-4xl max-h-[85vh] w-full" onClick={(e) => e.stopPropagation()}>
            <Image src={getWatermarkedUrl(lightboxPhoto)} alt={lightboxPhoto.title || 'Photo'} width={1200} height={800} className="object-contain max-h-[75vh] w-full" />
            <div className="flex items-center justify-between mt-4">
              <span className="text-[#9ca3af] text-sm">{lightboxPhoto.title || `Photo #${lightboxPhoto.sort_order + 1}`}</span>
              <button onClick={() => { setLightboxPhoto(null); openPurchase(lightboxPhoto); }} className="btn-gold">Purchase — ${(album.price_single / 100).toFixed(2)}</button>
            </div>
          </div>
        </div>
      )}

      {modalOpen && album && <PurchaseModal album={album} selectedPhoto={selectedPhoto} onClose={() => setModalOpen(false)} />}
    </div>
  );
}
