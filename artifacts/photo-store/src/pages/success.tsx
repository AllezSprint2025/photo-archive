import { Link } from "wouter";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export default function SuccessPage() {
  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="max-w-md w-full text-center bg-card p-8 md:p-12 rounded-3xl border border-border shadow-2xl relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-green-500 to-emerald-400" />
        
        <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-10 h-10 text-green-500" />
        </div>
        
        <h1 className="text-3xl font-display font-semibold mb-4 text-foreground">Payment Successful!</h1>
        <p className="text-muted-foreground mb-8 leading-relaxed">
          Thank you for your purchase. We are preparing your high-resolution files. 
          A download link has been sent to the email address you provided during checkout.
        </p>
        
        <div className="p-4 bg-muted rounded-xl mb-8 border border-border/50 text-sm text-left">
          <strong className="block text-foreground mb-1">Didn't receive it?</strong>
          Please check your spam or promotions folder. The download link is valid for 72 hours.
        </div>

        <Link href="/">
          <Button variant="outline" className="w-full">
            Back to Galleries <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </motion.div>
    </div>
  );
}
