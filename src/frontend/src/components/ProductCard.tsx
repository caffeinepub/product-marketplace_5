import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';
import { useCreateCheckoutSession } from '../hooks/useCheckout';
import { useCart } from '../hooks/useCart';
import { useStripeConfigured } from '../hooks/useQueries';
import type { Product, ShoppingItem } from '../backend';

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const createCheckoutSession = useCreateCheckoutSession();
  const { addToBasket, isAddingToBasket } = useCart();
  const { data: isStripeConfigured } = useStripeConfigured();
  const [isBuyingNow, setIsBuyingNow] = useState(false);

  const priceInDollars = Number(product.price) / 100;

  // Format category to show full path
  const formatCategory = (category: string) => {
    if (category.includes(' > ')) {
      return category.replace(' > ', ' › ');
    }
    return category;
  };

  const handleBuyNow = async () => {
    if (!isStripeConfigured) {
      toast.error('Payment system is not configured. Please contact the administrator.');
      return;
    }

    setIsBuyingNow(true);
    try {
      const shoppingItem: ShoppingItem = {
        productName: product.name,
        productDescription: product.description,
        priceInCents: product.price,
        quantity: BigInt(1),
        currency: 'usd',
      };

      const session = await createCheckoutSession.mutateAsync([shoppingItem]);
      if (!session?.url) {
        throw new Error('Stripe session missing url');
      }
      window.location.href = session.url;
    } catch (error: any) {
      toast.error(error.message || 'Failed to create checkout session');
      setIsBuyingNow(false);
    }
  };

  const handleAddToCart = async () => {
    try {
      await addToBasket({ productId: product.id, quantity: BigInt(1) });
      toast.success('Added to cart');
    } catch (error: any) {
      toast.error(error.message || 'Failed to add to cart');
    }
  };

  return (
    <Card className="group overflow-hidden border-sage/20 transition-all hover:shadow-lg">
      <div className="aspect-square overflow-hidden bg-cream/30">
        <img
          src={product.image.getDirectURL()}
          alt={product.name}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </div>
      <CardContent className="p-4">
        <div className="mb-2 flex items-start justify-between gap-2">
          <h3 className="font-serif text-lg font-medium text-foreground line-clamp-1">{product.name}</h3>
          <p className="whitespace-nowrap font-semibold text-terracotta">${priceInDollars.toFixed(2)}</p>
        </div>
        <p className="mb-2 text-sm text-muted-foreground">{formatCategory(product.categoryId)}</p>
        {product.description && (
          <p className="mb-4 text-xs text-muted-foreground line-clamp-2">{product.description}</p>
        )}
        <div className="flex gap-2">
          <Button
            onClick={handleBuyNow}
            disabled={isBuyingNow || !isStripeConfigured}
            className="flex-1 bg-terracotta hover:bg-terracotta/90"
            size="sm"
          >
            {isBuyingNow ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              'Buy Now'
            )}
          </Button>
          <Button
            onClick={handleAddToCart}
            disabled={isAddingToBasket || !isStripeConfigured}
            variant="outline"
            size="sm"
            className="border-sage/30 hover:bg-sage/10"
          >
            {isAddingToBasket ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ShoppingCart className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
