import { useState } from "react";
import { useRoute } from "wouter";
import { useGetAlbumBySlug } from "@workspace/api-client-react";
import { motion } from "framer-motion";
import { PurchaseModal } from "@/components/purchase-modal";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils";
import { ShoppingCart, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function AlbumView() {
  const [, params] = useRoute("/album/:slug");
  const slug = params?.slug || "";
  
  const { data: album, isLoading, error } = useGetAlbumBySlug(slug, {
    query: { enabled: !!slug }
  });

  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !album) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-2xl font-display font-semibold mb-4">Gallery Not Found</h2>
        <p className="text-muted-foreground mb-8">This collection might have been removed or is currently unavailable.</p>
        <Link href="/">
          <Button variant="outline"><ArrowLeft className="w-4 h-4 mr-2" /> Return Home</Button>
        </Link>
      </div>
    );
  }

  const handleBuyAlbum = () => {
    setSelectedPhotoId(null);
    setPurchaseModalOpen(true);
  };

  const handleBuySingle = (photoId: string) => {
    setSelectedPhotoId(photoId);
    setPurchaseModalOpen(true);
  };

  return (
    <div className="w-full pb-24">
      {/* Header */}
      <div className="border-b border-border/50 bg-card/30 backdrop-blur-lg sticky top-16 z-30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="max-w-3xl">
              <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary transition-colors mb-4">
                <ArrowLeft className="w-4 h-4 mr-1" /> Back to Galleries
              </Link>
              <h1 className="text-4xl md:text-5xl font-display font-bold tracking-tight mb-4">{album.title}</h1>
              {album.description && (
                <p className="text-lg text-muted-foreground font-light leading-relaxed">
                  {album.description}
                </p>
              )}
            </div>
            
            <div className="shrink-0 flex flex-col items-start md:items-end gap-3 bg-background/50 p-5 rounded-xl border border-border">
              <div className="text-sm text-muted-foreground">
                <span className="text-foreground font-medium">{album.photos.length}</span> high-res photos
              </div>
              <Button onClick={handleBuyAlbum} variant="premium" size="lg" className="w-full md:w-auto shadow-xl">
                <ShoppingCart className="w-5 h-5 mr-2" />
                Get Full Gallery — {formatPrice(album.priceAlbum)}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Photo Grid */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 mt-12">
        {album.photos.length === 0 ? (
          <div className="text-center py-24 bg-card rounded-2xl border border-border border-dashed">
            <p className="text-muted-foreground">No photos have been uploaded to this gallery yet.</p>
          </div>
        ) : (
          <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-6 space-y-6">
            {album.photos.map((photo, i) => (
              <motion.div 
                key={photo.id}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, margin: "100px" }}
                transition={{ duration: 0.4, delay: (i % 8) * 0.05 }}
                className="break-inside-avoid relative group rounded-xl overflow-hidden bg-muted border border-border shadow-md"
              >
                <img 
                  src={photo.watermarkedUrl} 
                  alt={photo.filename}
                  className="w-full h-auto object-cover block"
                  loading="lazy"
                />
                
                {/* Overlay on hover */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center p-6 text-center backdrop-blur-[2px]">
                  <p className="text-white/80 text-sm mb-4">High-resolution download</p>
                  <Button 
                    onClick={() => handleBuySingle(photo.id)}
                    className="bg-white text-black hover:bg-white/90 scale-95 group-hover:scale-100 transition-transform duration-300"
                  >
                    Buy This Photo — {formatPrice(album.priceSingle)}
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {purchaseModalOpen && (
        <PurchaseModal
          isOpen={purchaseModalOpen}
          onClose={() => setPurchaseModalOpen(false)}
          album={album}
          photoId={selectedPhotoId}
        />
      )}
    </div>
  );
}
