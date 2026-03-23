import React from "react";
import { Dialog } from "./ui/dialog";
import { Button } from "./ui/button";
import { formatPrice } from "@/lib/utils";
import { useCreateCheckout } from "@workspace/api-client-react";
import type { Album } from "@workspace/api-client-react/src/generated/api.schemas";
import { ShoppingBag, Image as ImageIcon, Images, ArrowRight } from "lucide-react";

interface PurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  album: Album;
  photoId?: string | null;
}

export function PurchaseModal({ isOpen, onClose, album, photoId }: PurchaseModalProps) {
  const isSingle = !!photoId;
  const createCheckout = useCreateCheckout();

  const handleCheckout = () => {
    createCheckout.mutate(
      {
        data: {
          albumId: album.id,
          purchaseType: isSingle ? "single" : "album",
          photoId: photoId,
        }
      },
      {
        onSuccess: (res) => {
          if (res.url) {
            window.location.href = res.url;
          }
        },
        onError: (err) => {
          console.error("Checkout failed:", err);
          alert("Failed to initialize checkout. Please try again.");
        }
      }
    );
  };

  const title = isSingle ? "Purchase Single Photo" : "Purchase Full Gallery";
  const price = isSingle ? album.priceSingle : album.priceAlbum;

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title={title}>
      <div className="mt-6 space-y-6">
        <div className="p-6 rounded-xl border border-primary/20 bg-primary/5 flex items-start gap-4">
          <div className="mt-1 p-2 bg-background rounded-lg border border-border shadow-sm">
            {isSingle ? <ImageIcon className="w-6 h-6 text-primary" /> : <Images className="w-6 h-6 text-primary" />}
          </div>
          <div>
            <h4 className="font-medium text-lg text-foreground leading-none mb-2">
              {isSingle ? "High-Resolution Image" : `Full Collection (${album.photoCount} photos)`}
            </h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              You will receive a download link via email instantly after your payment is completed. The photos are provided in high-resolution without watermarks.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between py-4 border-y border-border">
          <span className="font-display font-medium text-lg">Total Due</span>
          <span className="text-2xl font-semibold tracking-tight text-primary">
            {formatPrice(price)}
          </span>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            variant="premium" 
            className="flex-1" 
            onClick={handleCheckout}
            isLoading={createCheckout.isPending}
          >
            <ShoppingBag className="w-4 h-4 mr-2" />
            Pay securely
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
        
        <p className="text-xs text-center text-muted-foreground flex items-center justify-center gap-1.5">
          Payments are securely processed by Stripe
        </p>
      </div>
    </Dialog>
  );
}
