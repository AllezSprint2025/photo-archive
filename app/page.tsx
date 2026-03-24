import { createServiceClient } from '@/lib/supabase';
import { Album } from '@/lib/types';
import Image from 'next/image';
import Link from 'next/link';

async function getAlbums(): Promise<Album[]> {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from('albums')
      .select('*')
      .eq('published', true)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch { return []; }
}

export default async function HomePage() {
  const albums = await getAlbums();
  return (
    <div className="min-h-screen">
      <section className="relative py-24 px-4 text-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#1a1208]/60 to-[#0a0a0a] pointer-events-none" />
        <div className="relative z-10 max-w-3xl mx-auto animate-fade-in">
          <p className="text-[#c9a96e] text-xs tracking-[0.4em] uppercase mb-4">Fine Art Photography</p>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-light tracking-wide text-[#f5f5f5] mb-6 leading-tight">
            Moments Captured<br /><span className="text-[#c9a96e]">Forever</span>
          </h1>
          <hr className="divider max-w-xs mx-auto" />
          <p className="text-[#9ca3af] text-lg font-light leading-relaxed mt-6">
            Purchase high-resolution prints from curated collections. Each image delivered digitally to your inbox.
          </p>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <div className="flex items-center gap-4 mb-10">
          <h2 className="text-sm tracking-[0.3em] uppercase text-[#c9a96e]">Collections</h2>
          <div className="flex-1 h-px bg-[#2a2a2a]" />
        </div>

        {albums.length === 0 ? (
          <div className="text-center py-24 text-[#6b7280]">
            <svg className="mx-auto mb-4 opacity-30" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
              <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
            </svg>
            <p className="text-lg">No collections available yet.</p>
            <p className="text-sm mt-2">Check back soon — new work is on the way.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {albums.map((album) => (
              <Link key={album.id} href={`/gallery/${album.slug}`} className="group block card-dark overflow-hidden hover:border-[#c9a96e]/40 transition-colors duration-300">
                <div className="relative aspect-[4/3] bg-[#1a1a1a] overflow-hidden">
                  {album.cover_image_url ? (
                    <Image src={album.cover_image_url} alt={album.title} fill className="object-cover transition-transform duration-500 group-hover:scale-105" sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#2a2a2a" strokeWidth="1">
                        <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                      </svg>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="absolute bottom-3 left-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <span className="btn-gold text-xs px-3 py-1.5">View Collection</span>
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="text-[#f5f5f5] text-lg font-light tracking-wide mb-1 group-hover:text-[#c9a96e] transition-colors">{album.title}</h3>
                  {album.description && <p className="text-[#6b7280] text-sm line-clamp-2 mb-3">{album.description}</p>}
                  <div className="flex items-center justify-between text-xs tracking-wider text-[#9ca3af]">
                    <span>From <span className="text-[#c9a96e] font-semibold">${(album.price_single / 100).toFixed(2)}</span></span>
                    <span className="border border-[#2a2a2a] px-2 py-0.5 rounded">Album ${(album.price_album / 100).toFixed(2)}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
