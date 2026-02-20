import { Link, useNavigate } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { ShoppingBag, Settings } from 'lucide-react';
import { useCart } from '../hooks/useCart';

export default function Header() {
  const navigate = useNavigate();
  const { itemCount } = useCart();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-xl font-semibold tracking-tight">
          <ShoppingBag className="h-6 w-6 text-terracotta" />
          <span className="bg-gradient-to-r from-terracotta to-sage bg-clip-text text-transparent">
            Artisan Market
          </span>
        </Link>
        
        <nav className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => navigate({ to: '/' })}
            className="text-foreground/80 hover:text-foreground"
          >
            Shop
          </Button>
          <Button
            variant="ghost"
            onClick={() => navigate({ to: '/admin' })}
            className="text-foreground/80 hover:text-foreground"
          >
            <Settings className="mr-2 h-4 w-4" />
            Admin
          </Button>
          <Button
            variant="ghost"
            onClick={() => navigate({ to: '/cart' })}
            className="relative text-foreground/80 hover:text-foreground"
          >
            <ShoppingBag className="h-5 w-5" />
            {itemCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-terracotta text-xs font-semibold text-white">
                {itemCount}
              </span>
            )}
          </Button>
        </nav>
      </div>
    </header>
  );
}
