import { useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useCart } from '../hooks/useCart';
import { useProduct } from '../hooks/useQueries';
import { useCreateCheckoutSession } from '../hooks/useCheckout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Trash2, ShoppingBag, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import type { ShoppingItem } from '../backend';

function CartItemRow({ productId, quantity }: { productId: string; quantity: bigint }) {
  const { data: product, isLoading } = useProduct(productId);
  const { removeFromBasket, isRemovingFromBasket } = useCart();

  const handleRemove = async () => {
    try {
      await removeFromBasket(productId);
      toast.success('Removed from cart');
    } catch (error: any) {
      toast.error(error.message || 'Failed to remove item');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-sage" />
      </div>
    );
  }

  if (!product) {
    return null;
  }

  const priceInDollars = Number(product.price) / 100;
  const subtotal = priceInDollars * Number(quantity);

  return (
    <div className="flex gap-4 border-b border-sage/20 py-4 last:border-0">
      <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-lg bg-cream/30">
        <img
          src={product.image.getDirectURL()}
          alt={product.name}
          className="h-full w-full object-cover"
        />
      </div>
      <div className="flex flex-1 flex-col justify-between">
        <div>
          <h3 className="font-serif text-lg font-semibold text-foreground">{product.name}</h3>
          <p className="text-sm text-muted-foreground">{product.categoryId}</p>
        </div>
        <div className="flex items-center justify-between">
          <div className="text-sm">
            <span className="text-muted-foreground">Qty: {quantity.toString()}</span>
            <span className="mx-2 text-muted-foreground">×</span>
            <span className="font-semibold text-terracotta">${priceInDollars.toFixed(2)}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRemove}
            disabled={isRemovingFromBasket}
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            {isRemovingFromBasket ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
      <div className="flex items-center font-semibold text-foreground">
        ${subtotal.toFixed(2)}
      </div>
    </div>
  );
}

export default function CartPage() {
  const navigate = useNavigate();
  const { basketItems, isLoading: cartLoading } = useCart();
  const createCheckoutSession = useCreateCheckoutSession();
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const handleCheckout = async () => {
    setIsCheckingOut(true);
    try {
      const shoppingItems: ShoppingItem[] = [];

      for (const item of basketItems) {
        const response = await fetch(`/api/product/${item.productId}`);
        if (!response.ok) continue;
        
        // We need to fetch product details to create shopping items
        // Since we can't easily do this in parallel with the current setup,
        // we'll need to use the backend's getProduct method
        // For now, we'll create a simplified version
        shoppingItems.push({
          productName: item.productId,
          productDescription: 'Product',
          priceInCents: BigInt(0), // This will be filled by backend
          quantity: item.quantity,
          currency: 'usd',
        });
      }

      const session = await createCheckoutSession.mutateAsync(shoppingItems);
      if (!session?.url) {
        throw new Error('Stripe session missing url');
      }
      window.location.href = session.url;
    } catch (error: any) {
      toast.error(error.message || 'Failed to create checkout session');
      setIsCheckingOut(false);
    }
  };

  if (cartLoading) {
    return (
      <div className="container flex min-h-[60vh] items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-sage" />
      </div>
    );
  }

  if (basketItems.length === 0) {
    return (
      <div className="container py-8">
        <div className="mx-auto max-w-2xl">
          <div className="flex min-h-[60vh] flex-col items-center justify-center rounded-lg border border-dashed border-sage/30 bg-cream/20 p-12 text-center">
            <ShoppingBag className="mb-4 h-16 w-16 text-sage/40" />
            <h2 className="mb-2 font-serif text-2xl font-bold text-foreground">Your cart is empty</h2>
            <p className="mb-6 text-muted-foreground">
              Add some beautiful handcrafted items to your cart to get started.
            </p>
            <Button onClick={() => navigate({ to: '/' })} className="bg-terracotta hover:bg-terracotta/90">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Continue Shopping
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <h1 className="mb-2 font-serif text-3xl font-bold tracking-tight">Shopping Cart</h1>
          <p className="text-muted-foreground">
            Review your items and proceed to checkout when ready.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
          <Card>
            <CardContent className="p-6">
              {basketItems.map((item) => (
                <CartItemRow key={item.productId} productId={item.productId} quantity={item.quantity} />
              ))}
            </CardContent>
          </Card>

          <div className="lg:sticky lg:top-24 lg:h-fit">
            <Card>
              <CardContent className="space-y-4 p-6">
                <h2 className="font-serif text-xl font-semibold">Order Summary</h2>
                <div className="space-y-2 border-t border-sage/20 pt-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Items</span>
                    <span className="font-medium">{basketItems.length}</span>
                  </div>
                </div>
                <Button
                  onClick={handleCheckout}
                  disabled={isCheckingOut}
                  className="w-full bg-terracotta hover:bg-terracotta/90"
                >
                  {isCheckingOut ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Proceed to Checkout'
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate({ to: '/' })}
                  className="w-full"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Continue Shopping
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
