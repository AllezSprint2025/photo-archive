import { useState, useCallback } from "react";
import { useRoute, Link } from "wouter";
import { useAdminGetAlbum, useAdminSetCoverPhoto, useAdminDeletePhoto, useAdminUploadPhotos } from "@workspace/api-client-react";
import { getAdminGetAlbumQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getAdminHeaders } from "@/lib/utils";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { ArrowLeft, UploadCloud, Trash2, Image as ImageIcon, Star } from "lucide-react";
import { motion } from "framer-motion";

export default function AdminAlbumView() {
  const [, params] = useRoute("/admin/album/:id");
  const albumId = params?.id || "";
  const queryClient = useQueryClient();
  const headers = getAdminHeaders();

  const { data: album, isLoading, error } = useAdminGetAlbum(albumId, {
    query: { enabled: !!albumId },
    request: { headers }
  });

  const uploadPhotos = useAdminUploadPhotos({ request: { headers } });
  const setCover = useAdminSetCoverPhoto({ request: { headers } });
  const deletePhoto = useAdminDeletePhoto({ request: { headers } });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    uploadPhotos.mutate(
      { data: { albumId, files: acceptedFiles } },
      { onSuccess: () => queryClient.invalidateQueries({ queryKey: getAdminGetAlbumQueryKey(albumId) }) }
    );
  }, [albumId, uploadPhotos, queryClient]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop, 
    accept: { 'image/jpeg': ['.jpg', '.jpeg'], 'image/png': ['.png'] } 
  });

  const handleSetCover = (photoId: string) => {
    setCover.mutate(
      { id: albumId, data: { photoId } },
      { onSuccess: () => queryClient.invalidateQueries({ queryKey: getAdminGetAlbumQueryKey(albumId) }) }
    );
  };

  const handleDelete = (photoId: string) => {
    if (window.confirm("Delete this photo forever?")) {
      deletePhoto.mutate(
        { id: photoId },
        { onSuccess: () => queryClient.invalidateQueries({ queryKey: getAdminGetAlbumQueryKey(albumId) }) }
      );
    }
  };

  if (isLoading) {
    return <div className="flex-1 flex justify-center py-24"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  if (error || !album) {
    return <div className="p-8 text-center text-destructive">Failed to load album details.</div>;
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link href="/admin" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
      </Link>
      
      <div className="mb-8">
        <h1 className="text-3xl font-display font-semibold mb-2">{album.title}</h1>
        <p className="text-muted-foreground text-sm">Manage photos, set cover image, and upload new high-resolution files.</p>
      </div>

      {/* Upload Zone */}
      <div 
        {...getRootProps()} 
        className={`mb-12 p-12 rounded-2xl border-2 border-dashed transition-all cursor-pointer text-center flex flex-col items-center justify-center ${isDragActive ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-primary/50 hover:bg-muted/50'}`}
      >
        <input {...getInputProps()} />
        <UploadCloud className={`w-12 h-12 mb-4 ${isDragActive ? 'text-primary' : 'text-muted-foreground'}`} />
        <h3 className="text-lg font-medium text-foreground mb-1">
          {isDragActive ? "Drop photos here..." : "Drag & drop photos"}
        </h3>
        <p className="text-sm text-muted-foreground mb-4">or click to browse from your computer (JPEG, PNG)</p>
        
        <Button variant={isDragActive ? "premium" : "outline"} disabled={uploadPhotos.isPending}>
          {uploadPhotos.isPending ? "Uploading..." : "Select Files"}
        </Button>
        {uploadPhotos.isPending && <p className="text-xs text-primary mt-4 animate-pulse">Processing and watermarking files, please wait...</p>}
      </div>

      {/* Photo Grid */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-display font-semibold">Gallery Photos ({album.photos.length})</h2>
        </div>

        {album.photos.length === 0 ? (
          <div className="p-12 text-center border border-border rounded-xl bg-card">
            <ImageIcon className="w-8 h-8 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-muted-foreground">No photos yet. Upload some above!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {album.photos.map((photo) => {
              const isCover = album.coverPhotoId === photo.id;
              
              return (
                <motion.div 
                  key={photo.id}
                  layoutId={photo.id}
                  className={`relative group aspect-square rounded-xl overflow-hidden bg-muted border-2 transition-colors ${isCover ? 'border-primary' : 'border-transparent hover:border-border'}`}
                >
                  <img 
                    src={photo.watermarkedUrl} 
                    alt={photo.filename}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  
                  {isCover && (
                    <div className="absolute top-2 left-2 bg-primary text-white text-xs font-medium px-2 py-1 rounded-md shadow-lg flex items-center gap-1">
                      <Star className="w-3 h-3 fill-current" /> Cover
                    </div>
                  )}

                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-4">
                    {!isCover && (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="w-full bg-black/50 border-white/20 text-white hover:bg-white hover:text-black"
                        onClick={(e) => { e.stopPropagation(); handleSetCover(photo.id); }}
                        disabled={setCover.isPending}
                      >
                        Set Cover
                      </Button>
                    )}
                    <Button 
                      size="sm" 
                      variant="destructive" 
                      className="w-full"
                      onClick={(e) => { e.stopPropagation(); handleDelete(photo.id); }}
                      disabled={deletePhoto.isPending}
                    >
                      <Trash2 className="w-4 h-4 mr-2" /> Delete
                    </Button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
