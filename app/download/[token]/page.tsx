import { createServiceClient } from '@/lib/supabase';
import { Order, Photo, Album } from '@/lib/types';
import { notFound } from 'next/navigation';

async function getOrderWithDetails(token: string) {
  const supabase = createServiceClient();
  const { data: order, error } = await supabase.from('orders').select('*').eq('download_token', token).single();
  if (error || !order) return null;

  let album: Album | null = null;
  let photos: Photo[] = [];

  if (order.album_id) {
    const { data } = await supabase.from('albums').select('*').eq('id', order.album_id).single();
    album = data;
  }

  if (order.purchase_type === 'album' && order.album_id) {
    const { data } = await supabase.from('photos').select('*').eq('album_id', order.album_id).order('sort_order', { ascending: true });
    photos = data || [];
  } else if (order.purchase_type === 'single' && order.photo_id) {
    const { data } = await supabase.from('photos').select('*').eq('id', order.photo_id).single();
    if (data) photos = [data];
  }

  return { order: order as Order, album, photos };
}

export default async function DownloadPage({ params }: { params: { token: string } }) {
  const result = await getOrderWithDetails(params.token);
  if (!result) return notFound();

  const { order, album, photos } = result;
  const isExpired = new Date(order.token_expires_at) < new Date();

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-2xl">
        {isExpired ? (
          <div className="card-dark p-8 text-center animate-fade-in">
            <svg className="mx-auto mb-4 text-red-400" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <h1 className="text-2xl font-light text-[#f5f5f5] mb-3">Link Expired</h1>
            <p className="text-[#6b7280]">This download link has expired. Links are valid for 72 hours after purchase.</p>
          </div>
        ) : (
          <div className="card-dark p-8 animate-fade-in">
            <div className="text-center mb-8">
              <svg className="mx-auto mb-4 text-[#c9a96e]" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              <p className="text-[#c9a96e] text-xs tracking-[0.4em] uppercase mb-2">Thank You</p>
              <h1 className="text-2xl font-light text-[#f5f5f5]">Your Downloads</h1>
              {album && <p className="text-[#9ca3af] mt-2">{album.title}</p>}
            </div>
            <hr className="divider mb-6" />
            <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
              <div className="p-3 bg-[#1a1a1a] rounded border border-[#2a2a2a]">
                <p className="text-[#6b7280] text-xs uppercase tracking-wider mb-1">Order Type</p>
                <p className="text-[#f5f5f5]">{order.purchase_type === 'album' ? 'Full Album' : 'Single Photo'}</p>
              </div>
              <div className="p-3 bg-[#1a1a1a] rounded border border-[#2a2a2a]">
                <p className="text-[#6b7280] text-xs uppercase tracking-wider mb-1">Expires</p>
                <p className="text-[#f5f5f5]">{new Date(order.token_expires_at).toLocaleDateString()}</p>
              </div>
            </div>
            <div>
              <p className="text-xs tracking-wider uppercase text-[#6b7280] mb-3">{photos.length} Photo{photos.length !== 1 ? 's' : ''} Available</p>
              <div className="space-y-2">
                {photos.map((photo, i) => (
                  <div key={photo.id} className="flex items-center justify-between p-4 bg-[#1a1a1a] border border-[#2a2a2a] rounded hover:border-[#c9a96e]/40 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-[#2a2a2a] rounded flex items-center justify-center text-[#6b7280] text-xs font-mono flex-shrink-0">
                        {String(i + 1).padStart(2, '0')}
                      </div>
                      <span className="text-[#9ca3af] text-sm">{photo.title || `Photo ${i + 1}`}</span>
                    </div>
                    <a href={`/api/download/${params.token}?photoId=${photo.id}`} className="btn-gold text-xs px-3 py-1.5 flex items-center gap-1.5" download>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                      </svg>
                      Download
                    </a>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-8 p-4 bg-[#1a1a1a] rounded border border-[#2a2a2a] text-xs text-[#6b7280] text-center leading-relaxed">
              Full-resolution unwatermarked originals. For personal use only. All rights reserved — © FoculPoint Photography.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
