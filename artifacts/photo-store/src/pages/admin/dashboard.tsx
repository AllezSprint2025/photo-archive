import { useState } from "react";
import { useAdminGetAlbums, useAdminCreateAlbum, useAdminDeleteAlbum, useAdminPublishAlbum } from "@workspace/api-client-react";
import { getAdminHeaders, formatPrice } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { getAdminGetAlbumsQueryKey } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { Plus, Image as ImageIcon, CheckCircle2, XCircle, Trash2, Edit } from "lucide-react";
import { format } from "date-fns";

export default function AdminDashboard() {
  const queryClient = useQueryClient();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  
  const headers = getAdminHeaders();
  
  const { data: albums, isLoading, error } = useAdminGetAlbums({ request: { headers } });
  
  const createAlbum = useAdminCreateAlbum({ request: { headers } });
  const publishAlbum = useAdminPublishAlbum({ request: { headers } });
  const deleteAlbum = useAdminDeleteAlbum({ request: { headers } });

  const handleTogglePublish = (id: string, currentStatus: boolean) => {
    publishAlbum.mutate(
      { id, data: { isPublished: !currentStatus } },
      { onSuccess: () => queryClient.invalidateQueries({ queryKey: getAdminGetAlbumsQueryKey() }) }
    );
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this album? This action cannot be undone.")) {
      deleteAlbum.mutate(
        { id },
        { onSuccess: () => queryClient.invalidateQueries({ queryKey: getAdminGetAlbumsQueryKey() }) }
      );
    }
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-display font-semibold mb-1">Gallery Management</h1>
          <p className="text-muted-foreground text-sm">Create and organize your photography collections.</p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)} variant="premium">
          <Plus className="w-4 h-4 mr-2" /> New Gallery
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : error ? (
        <div className="p-4 bg-destructive/10 text-destructive rounded-xl border border-destructive/20 text-center">
          Failed to load galleries. Ensure your secret key is correct.
        </div>
      ) : (
        <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-muted-foreground text-xs uppercase tracking-wider font-semibold">
                  <th className="p-4 font-medium">Gallery</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium">Pricing (Single / Album)</th>
                  <th className="p-4 font-medium">Photos</th>
                  <th className="p-4 font-medium">Created</th>
                  <th className="p-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {albums?.length === 0 ? (
                  <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No galleries found. Create one to get started.</td></tr>
                ) : (
                  albums?.map(album => (
                    <tr key={album.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-md bg-muted border border-border overflow-hidden flex-shrink-0">
                            {album.coverPhotoUrl ? (
                              <img src={album.coverPhotoUrl} className="w-full h-full object-cover" alt="" />
                            ) : (
                              <ImageIcon className="w-5 h-5 m-2.5 text-muted-foreground/50" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{album.title}</p>
                            <p className="text-xs text-muted-foreground">/{album.slug}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <button 
                          onClick={() => handleTogglePublish(album.id, album.isPublished)}
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${album.isPublished ? 'bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500/20' : 'bg-muted text-muted-foreground border-border hover:bg-muted/80'}`}
                        >
                          {album.isPublished ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
                          {album.isPublished ? 'Published' : 'Draft'}
                        </button>
                      </td>
                      <td className="p-4 text-sm text-foreground">
                        {formatPrice(album.priceSingle)} / {formatPrice(album.priceAlbum)}
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">{album.photoCount}</td>
                      <td className="p-4 text-sm text-muted-foreground">{format(new Date(album.createdAt), 'MMM d, yyyy')}</td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/admin/album/${album.id}`}>
                            <Button variant="outline" size="sm" className="h-8 text-xs">Manage Photos</Button>
                          </Link>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => handleDelete(album.id)}
                            disabled={deleteAlbum.isPending}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {isCreateModalOpen && (
        <CreateAlbumModal 
          isOpen={isCreateModalOpen} 
          onClose={() => setIsCreateModalOpen(false)} 
          onCreate={(data) => {
            createAlbum.mutate({ data }, {
              onSuccess: () => {
                queryClient.invalidateQueries({ queryKey: getAdminGetAlbumsQueryKey() });
                setIsCreateModalOpen(false);
              }
            });
          }}
          isPending={createAlbum.isPending}
        />
      )}
    </div>
  );
}

function CreateAlbumModal({ isOpen, onClose, onCreate, isPending }: any) {
  const [formData, setFormData] = useState({
    title: '', slug: '', description: '', priceSingle: '5', priceAlbum: '25'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreate({
      title: formData.title,
      slug: formData.slug.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
      description: formData.description,
      priceSingle: parseFloat(formData.priceSingle) || 0,
      priceAlbum: parseFloat(formData.priceAlbum) || 0,
    });
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Create New Gallery">
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1.5 text-muted-foreground">Title</label>
          <Input 
            required 
            value={formData.title} 
            onChange={(e) => {
              const title = e.target.value;
              const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
              setFormData(prev => ({ ...prev, title, slug }));
            }} 
            placeholder="e.g. Summer Wedding" 
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5 text-muted-foreground">URL Slug</label>
          <Input required value={formData.slug} onChange={(e) => setFormData(p => ({ ...p, slug: e.target.value }))} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5 text-muted-foreground">Description (optional)</label>
          <textarea 
            className="flex min-h-[80px] w-full rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={formData.description}
            onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))}
            placeholder="Describe this collection..."
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1.5 text-muted-foreground">Single Photo Price ($)</label>
            <Input type="number" step="0.01" min="0" required value={formData.priceSingle} onChange={(e) => setFormData(p => ({ ...p, priceSingle: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5 text-muted-foreground">Full Album Price ($)</label>
            <Input type="number" step="0.01" min="0" required value={formData.priceAlbum} onChange={(e) => setFormData(p => ({ ...p, priceAlbum: e.target.value }))} />
          </div>
        </div>
        <div className="pt-4 flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="premium" isLoading={isPending}>Create Gallery</Button>
        </div>
      </form>
    </Dialog>
  );
}
