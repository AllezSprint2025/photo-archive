'use client';
import { useState, useEffect, useCallback } from 'react';
import { Album, Photo, Order, PromoCode } from '@/lib/types';

type Tab = 'albums' | 'orders' | 'promos';

function AuthGate({ onAuth }: { onAuth: (pw: string) => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/admin/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) });
      if (res.ok) { sessionStorage.setItem('admin_auth', password); onAuth(password); }
      else setError('Incorrect password');
    } catch { setError('Authentication error'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="card-dark p-8 w-full max-w-sm animate-fade-in">
        <div className="text-center mb-8">
          <p className="text-[#c9a96e] text-xs tracking-[0.4em] uppercase mb-2">Admin</p>
          <h1 className="text-2xl font-light text-[#f5f5f5]">FoculPoint Admin</h1>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs tracking-wider uppercase text-[#6b7280] mb-2">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="input-dark" placeholder="Enter admin password" autoFocus />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button type="submit" disabled={loading} className="btn-gold w-full py-3">{loading ? <span className="spinner mx-auto" /> : 'Enter'}</button>
        </form>
      </div>
    </div>
  );
}

function AlbumForm({ album, onSave, onCancel, adminPassword }: { album: Partial<Album> | null; onSave: () => void; onCancel: () => void; adminPassword: string }) {
  const [form, setForm] = useState({ title: album?.title || '', slug: album?.slug || '', description: album?.description || '', price_album: album ? album.price_album! / 100 : 49.99, price_single: album ? album.price_single! / 100 : 9.99, published: album?.published ?? false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const autoSlug = (title: string) => title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError('');
    try {
      const payload = { ...form, price_album: Math.round(form.price_album * 100), price_single: Math.round(form.price_single * 100) };
      const res = await fetch('/api/admin/albums', { method: album?.id ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-password': adminPassword }, body: JSON.stringify(album?.id ? { ...payload, id: album.id } : payload) });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      onSave();
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Error'); }
    finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-6 card-dark">
      <h3 className="text-[#f5f5f5] text-lg font-light">{album?.id ? 'Edit Album' : 'New Album'}</h3>
      <div><label className="block text-xs uppercase tracking-wider text-[#6b7280] mb-1">Title</label>
        <input value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value, slug: f.slug || autoSlug(e.target.value) }))} className="input-dark" placeholder="Golden Hour" required /></div>
      <div><label className="block text-xs uppercase tracking-wider text-[#6b7280] mb-1">Slug</label>
        <input value={form.slug} onChange={(e) => setForm(f => ({ ...f, slug: e.target.value }))} className="input-dark" placeholder="golden-hour" required /></div>
      <div><label className="block text-xs uppercase tracking-wider text-[#6b7280] mb-1">Description</label>
        <textarea value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} className="input-dark" rows={3} /></div>
      <div className="grid grid-cols-2 gap-4">
        <div><label className="block text-xs uppercase tracking-wider text-[#6b7280] mb-1">Album Price ($)</label>
          <input type="number" step="0.01" value={form.price_album} onChange={(e) => setForm(f => ({ ...f, price_album: parseFloat(e.target.value) }))} className="input-dark" required /></div>
        <div><label className="block text-xs uppercase tracking-wider text-[#6b7280] mb-1">Single Price ($)</label>
          <input type="number" step="0.01" value={form.price_single} onChange={(e) => setForm(f => ({ ...f, price_single: parseFloat(e.target.value) }))} className="input-dark" required /></div>
      </div>
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={form.published} onChange={(e) => setForm(f => ({ ...f, published: e.target.checked }))} className="w-4 h-4 accent-[#c9a96e]" />
        <span className="text-sm text-[#9ca3af]">Published (visible to customers)</span>
      </label>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <div className="flex gap-3">
        <button type="submit" disabled={loading} className="btn-gold">{loading ? <span className="spinner" /> : 'Save Album'}</button>
        <button type="button" onClick={onCancel} className="btn-outline">Cancel</button>
      </div>
    </form>
  );
}

function PhotoUploader({ albumId, adminPassword, onUploaded }: { albumId: string; adminPassword: string; onUploaded: () => void }) {
  const [files, setFiles] = useState<FileList | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState('');

  const handleUpload = async () => {
    if (!files || files.length === 0) return;
    setUploading(true);
    for (let i = 0; i < files.length; i++) {
      setProgress(`Uploading ${i + 1} of ${files.length}…`);
      const formData = new FormData();
      formData.append('file', files[i]);
      formData.append('albumId', albumId);
      await fetch('/api/upload', { method: 'POST', headers: { 'x-admin-password': adminPassword }, body: formData });
    }
    setUploading(false); setProgress(''); setFiles(null); onUploaded();
  };

  return (
    <div className="p-4 border border-dashed border-[#2a2a2a] rounded space-y-3">
      <p className="text-xs uppercase tracking-wider text-[#6b7280]">Upload Photos</p>
      <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(e) => setFiles(e.target.files)} className="text-sm text-[#9ca3af] file:mr-3 file:btn-gold file:border-0 file:cursor-pointer" />
      {files && <p className="text-xs text-[#9ca3af]">{files.length} file{files.length !== 1 ? 's' : ''} selected</p>}
      {progress && <p className="text-xs text-[#c9a96e]">{progress}</p>}
      <button onClick={handleUpload} disabled={uploading || !files} className="btn-gold text-xs">{uploading ? <span className="spinner" /> : 'Upload & Watermark'}</button>
    </div>
  );
}

export default function AdminPage() {
  const [adminPassword, setAdminPassword] = useState(() => typeof window !== 'undefined' ? sessionStorage.getItem('admin_auth') || '' : '');
  const [authed, setAuthed] = useState(false);
  const [tab, setTab] = useState<Tab>('albums');
  const [albums, setAlbums] = useState<Album[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [promos, setPromos] = useState<PromoCode[]>([]);
  const [editingAlbum, setEditingAlbum] = useState<Partial<Album> | null | undefined>(undefined);
  const [expandedAlbum, setExpandedAlbum] = useState<string | null>(null);
  const [albumPhotos, setAlbumPhotos] = useState<Record<string, Photo[]>>({});
  const [newPromo, setNewPromo] = useState({ code: '', discount_percent: 10, max_uses: '', expires_at: '' });
  const [promoLoading, setPromoLoading] = useState(false);

  useEffect(() => {
    const saved = sessionStorage.getItem('admin_auth');
    if (saved) { setAdminPassword(saved); setAuthed(true); }
  }, []);

  const headers = useCallback(() => ({ 'Content-Type': 'application/json', 'x-admin-password': adminPassword }), [adminPassword]);

  const loadAlbums = useCallback(async () => {
    const res = await fetch('/api/admin/albums', { headers: headers() });
    if (res.ok) setAlbums(await res.json());
  }, [headers]);

  const loadOrders = useCallback(async () => {
    const res = await fetch('/api/admin/orders', { headers: headers() });
    if (res.ok) setOrders(await res.json());
  }, [headers]);

  const loadPromos = useCallback(async () => {
    const res = await fetch('/api/admin/promos', { headers: headers() });
    if (res.ok) setPromos(await res.json());
  }, [headers]);

  useEffect(() => {
    if (!authed) return;
    loadAlbums(); loadOrders(); loadPromos();
  }, [authed, loadAlbums, loadOrders, loadPromos]);

  const loadPhotos = async (albumId: string) => {
    const res = await fetch(`/api/admin/albums?albumId=${albumId}`, { headers: headers() });
    if (res.ok) { const data = await res.json(); setAlbumPhotos(p => ({ ...p, [albumId]: data })); }
  };

  const toggleAlbum = (albumId: string) => {
    if (expandedAlbum === albumId) { setExpandedAlbum(null); return; }
    setExpandedAlbum(albumId);
    if (!albumPhotos[albumId]) loadPhotos(albumId);
  };

  const deleteAlbum = async (id: string) => {
    if (!confirm('Delete this album and all its photos?')) return;
    await fetch('/api/admin/albums', { method: 'DELETE', headers: headers(), body: JSON.stringify({ id }) });
    loadAlbums();
  };

  const togglePromo = async (id: string, active: boolean) => {
    await fetch('/api/admin/promos', { method: 'PATCH', headers: headers(), body: JSON.stringify({ id, active }) });
    loadPromos();
  };

  const deletePromo = async (id: string) => {
    if (!confirm('Delete this promo code?')) return;
    await fetch('/api/admin/promos', { method: 'DELETE', headers: headers(), body: JSON.stringify({ id }) });
    loadPromos();
  };

  const createPromo = async (e: React.FormEvent) => {
    e.preventDefault(); setPromoLoading(true);
    await fetch('/api/admin/promos', { method: 'POST', headers: headers(), body: JSON.stringify({ code: newPromo.code, discount_percent: newPromo.discount_percent, max_uses: newPromo.max_uses ? parseInt(newPromo.max_uses) : null, expires_at: newPromo.expires_at || null }) });
    setNewPromo({ code: '', discount_percent: 10, max_uses: '', expires_at: '' });
    setPromoLoading(false); loadPromos();
  };

  if (!authed) return <AuthGate onAuth={(pw) => { setAdminPassword(pw); setAuthed(true); }} />;

  return (
    <div className="min-h-screen">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-center justify-between mb-8">
          <div><p className="text-[#c9a96e] text-xs tracking-[0.4em] uppercase mb-1">Dashboard</p><h1 className="text-3xl font-light text-[#f5f5f5]">Admin Panel</h1></div>
          <button onClick={() => { sessionStorage.removeItem('admin_auth'); setAuthed(false); }} className="btn-outline text-xs">Sign Out</button>
        </div>

        <div className="flex gap-1 mb-8 border-b border-[#2a2a2a]">
          {(['albums', 'orders', 'promos'] as Tab[]).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`px-5 py-3 text-sm tracking-wider uppercase transition-colors ${tab === t ? 'text-[#c9a96e] border-b-2 border-[#c9a96e] -mb-px' : 'text-[#6b7280] hover:text-[#9ca3af]'}`}>{t}</button>
          ))}
        </div>

        {tab === 'albums' && (
          <div className="space-y-6">
            {editingAlbum !== undefined ? (
              <AlbumForm album={editingAlbum} adminPassword={adminPassword} onSave={() => { setEditingAlbum(undefined); loadAlbums(); }} onCancel={() => setEditingAlbum(undefined)} />
            ) : (
              <button onClick={() => setEditingAlbum(null)} className="btn-gold">+ New Album</button>
            )}
            <div className="space-y-4">
              {albums.map((album) => (
                <div key={album.id} className="card-dark overflow-hidden">
                  <div className="p-5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <button onClick={() => toggleAlbum(album.id)} className="text-[#6b7280] hover:text-[#c9a96e]">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`transition-transform ${expandedAlbum === album.id ? 'rotate-90' : ''}`}><polyline points="9 18 15 12 9 6"/></svg>
                      </button>
                      <div>
                        <p className="text-[#f5f5f5] font-light">{album.title}</p>
                        <p className="text-xs text-[#6b7280]">/{album.slug} · ${(album.price_single / 100).toFixed(2)} / ${(album.price_album / 100).toFixed(2)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs px-2 py-0.5 rounded ${album.published ? 'bg-green-900/50 text-green-400' : 'bg-[#2a2a2a] text-[#6b7280]'}`}>{album.published ? 'Published' : 'Draft'}</span>
                      <button onClick={() => setEditingAlbum(album)} className="btn-outline text-xs px-3 py-1">Edit</button>
                      <button onClick={() => deleteAlbum(album.id)} className="text-red-400 hover:text-red-300 text-xs">Delete</button>
                    </div>
                  </div>
                  {expandedAlbum === album.id && (
                    <div className="border-t border-[#2a2a2a] p-5 space-y-4">
                      <PhotoUploader albumId={album.id} adminPassword={adminPassword} onUploaded={() => { loadPhotos(album.id); loadAlbums(); }} />
                      {albumPhotos[album.id] && (
                        <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2">
                          {albumPhotos[album.id].map((photo) => (
                            <div key={photo.id} className="aspect-square bg-[#1a1a1a] rounded overflow-hidden relative group">
                              <img src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/photos/${photo.watermarked_path || photo.storage_path}`} alt={photo.title || ''} className="w-full h-full object-cover" />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'orders' && (
          <div className="space-y-3">
            {orders.length === 0 ? <p className="text-[#6b7280] text-center py-12">No orders yet.</p> : orders.map((order) => (
              <div key={order.id} className="card-dark p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="text-[#f5f5f5] text-sm">{order.email}</p>
                  <p className="text-xs text-[#6b7280] mt-1">{order.purchase_type === 'album' ? 'Full Album' : 'Single Photo'} · ${(order.amount_paid / 100).toFixed(2)}{order.promo_code ? ` · Promo: ${order.promo_code}` : ''}</p>
                  <p className="text-xs text-[#6b7280]">{new Date(order.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-0.5 rounded ${order.fulfilled ? 'bg-green-900/50 text-green-400' : 'bg-yellow-900/50 text-yellow-400'}`}>{order.fulfilled ? 'Fulfilled' : 'Pending'}</span>
                  <span className="text-xs text-[#6b7280]">{order.download_count} downloads</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'promos' && (
          <div className="space-y-6">
            <form onSubmit={createPromo} className="card-dark p-6 space-y-4">
              <h3 className="text-[#f5f5f5] font-light">Create Promo Code</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label className="block text-xs uppercase tracking-wider text-[#6b7280] mb-1">Code</label>
                  <input value={newPromo.code} onChange={(e) => setNewPromo(p => ({ ...p, code: e.target.value.toUpperCase() }))} className="input-dark" placeholder="SAVE20" required /></div>
                <div><label className="block text-xs uppercase tracking-wider text-[#6b7280] mb-1">Discount %</label>
                  <input type="number" min="1" max="100" value={newPromo.discount_percent} onChange={(e) => setNewPromo(p => ({ ...p, discount_percent: parseInt(e.target.value) }))} className="input-dark" required /></div>
                <div><label className="block text-xs uppercase tracking-wider text-[#6b7280] mb-1">Max Uses (blank = unlimited)</label>
                  <input type="number" value={newPromo.max_uses} onChange={(e) => setNewPromo(p => ({ ...p, max_uses: e.target.value }))} className="input-dark" placeholder="Unlimited" /></div>
                <div><label className="block text-xs uppercase tracking-wider text-[#6b7280] mb-1">Expires At (blank = never)</label>
                  <input type="date" value={newPromo.expires_at} onChange={(e) => setNewPromo(p => ({ ...p, expires_at: e.target.value }))} className="input-dark" /></div>
              </div>
              <button type="submit" disabled={promoLoading} className="btn-gold">{promoLoading ? <span className="spinner" /> : 'Create Code'}</button>
            </form>
            <div className="space-y-3">
              {promos.map((promo) => (
                <div key={promo.id} className="card-dark p-5 flex items-center justify-between">
                  <div>
                    <p className="text-[#f5f5f5] font-mono tracking-wider">{promo.code}</p>
                    <p className="text-xs text-[#6b7280] mt-1">{promo.discount_percent}% off · {promo.use_count}/{promo.max_uses ?? '∞'} uses{promo.expires_at ? ` · Expires ${new Date(promo.expires_at).toLocaleDateString()}` : ''}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={() => togglePromo(promo.id, !promo.active)} className={`text-xs px-2 py-0.5 rounded ${promo.active ? 'bg-green-900/50 text-green-400' : 'bg-[#2a2a2a] text-[#6b7280]'}`}>{promo.active ? 'Active' : 'Inactive'}</button>
                    <button onClick={() => deletePromo(promo.id)} className="text-red-400 hover:text-red-300 text-xs">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
