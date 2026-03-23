import { useGetAlbums } from "@workspace/api-client-react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { formatPrice } from "@/lib/utils";
import { Image as ImageIcon, ArrowRight } from "lucide-react";

export default function Home() {
  const { data: albums, isLoading, error } = useGetAlbums();

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground tracking-widest font-display uppercase text-sm">Loading Galleries...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 text-center text-destructive">
        <p>Failed to load galleries. Please try again later.</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Hero Section */}
      <section className="relative h-[60vh] min-h-[500px] flex items-center justify-center overflow-hidden">
        {/* Background Image requested in requirements.yaml */}
        <div className="absolute inset-0 z-0">
          <img 
            src={`${import.meta.env.BASE_URL}images/hero-bg.png`} 
            alt="Hero Background" 
            className="w-full h-full object-cover opacity-40 mix-blend-lighten"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/80 to-background" />
        </div>
        
        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto mt-12">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="text-5xl md:text-7xl font-display font-bold tracking-tight text-white mb-6 drop-shadow-lg"
          >
            Capturing the Essence of Light
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            className="text-lg md:text-xl text-white/80 font-light max-w-2xl mx-auto leading-relaxed"
          >
            Explore exclusive high-resolution photographic galleries. Browse, curate, and purchase individual prints or full collections directly.
          </motion.p>
        </div>
      </section>

      {/* Galleries Grid */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        <div className="flex items-center justify-between mb-12">
          <h2 className="text-3xl font-display font-semibold">Featured Galleries</h2>
        </div>

        {albums?.length === 0 ? (
          <div className="text-center py-24 bg-card rounded-2xl border border-border border-dashed">
            <ImageIcon className="w-12 h-12 mx-auto text-muted-foreground mb-4 opacity-50" />
            <h3 className="text-xl font-medium mb-2">No galleries available</h3>
            <p className="text-muted-foreground">Check back later for new photography collections.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {albums?.map((album, i) => (
              <motion.div
                key={album.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <Link href={`/album/${album.slug}`} className="group block h-full">
                  <article className="h-full flex flex-col bg-card rounded-2xl overflow-hidden border border-border/50 hover:border-primary/50 transition-all duration-500 hover:shadow-2xl hover:shadow-primary/10">
                    <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                      {album.coverPhotoUrl ? (
                        <img 
                          src={album.coverPhotoUrl} 
                          alt={album.title} 
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon className="w-12 h-12 text-muted-foreground/30" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-300" />
                      
                      <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-medium text-white border border-white/10">
                        {album.photoCount} {album.photoCount === 1 ? 'photo' : 'photos'}
                      </div>
                    </div>
                    
                    <div className="p-6 flex-1 flex flex-col">
                      <h3 className="text-2xl font-display font-semibold mb-2 group-hover:text-primary transition-colors">
                        {album.title}
                      </h3>
                      {album.description && (
                        <p className="text-muted-foreground text-sm line-clamp-2 mb-6 flex-1">
                          {album.description}
                        </p>
                      )}
                      
                      <div className="mt-auto pt-4 border-t border-border flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-xs text-muted-foreground uppercase tracking-wider">Full Album</span>
                          <span className="font-semibold text-lg">{formatPrice(album.priceAlbum)}</span>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                          <ArrowRight className="w-5 h-5" />
                        </div>
                      </div>
                    </div>
                  </article>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
