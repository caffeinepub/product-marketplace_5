import { SiX, SiFacebook, SiInstagram } from 'react-icons/si';
import { Heart } from 'lucide-react';

export default function Footer() {
  const appIdentifier = typeof window !== 'undefined' 
    ? encodeURIComponent(window.location.hostname)
    : 'unknown-app';
  
  const caffeineUrl = `https://caffeine.ai/?utm_source=Caffeine-footer&utm_medium=referral&utm_content=${appIdentifier}`;

  return (
    <footer className="border-t border-border/40 bg-cream/30">
      <div className="container py-12">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <h3 className="mb-4 font-serif text-lg font-semibold text-terracotta">About</h3>
            <p className="text-sm text-muted-foreground">
              Discover unique, handcrafted products from talented artisans. Each piece tells a story.
            </p>
          </div>
          
          <div>
            <h3 className="mb-4 font-serif text-lg font-semibold text-terracotta">Connect</h3>
            <div className="flex gap-4">
              <a href="#" className="text-muted-foreground transition-colors hover:text-terracotta">
                <SiInstagram className="h-5 w-5" />
              </a>
              <a href="#" className="text-muted-foreground transition-colors hover:text-terracotta">
                <SiFacebook className="h-5 w-5" />
              </a>
              <a href="#" className="text-muted-foreground transition-colors hover:text-terracotta">
                <SiX className="h-5 w-5" />
              </a>
            </div>
          </div>
          
          <div>
            <h3 className="mb-4 font-serif text-lg font-semibold text-terracotta">Support</h3>
            <p className="text-sm text-muted-foreground">
              Questions? Reach out to us at hello@artisanmarket.com
            </p>
          </div>
        </div>
        
        <div className="mt-8 border-t border-border/40 pt-8 text-center text-sm text-muted-foreground">
          <p className="flex items-center justify-center gap-1">
            Built with <Heart className="h-4 w-4 fill-terracotta text-terracotta" /> using{' '}
            <a 
              href={caffeineUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-terracotta hover:underline"
            >
              caffeine.ai
            </a>
          </p>
          <p className="mt-2">© {new Date().getFullYear()} Artisan Market. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
