import { useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useCart } from '../hooks/useCart';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, ArrowLeft } from 'lucide-react';

export default function PaymentSuccess() {
  const navigate = useNavigate();
  const { clearBasket } = useCart();

  useEffect(() => {
    const clearCart = async () => {
      try {
        await clearBasket();
      } catch (error) {
        console.error('Failed to clear basket:', error);
      }
    };
    clearCart();
  }, [clearBasket]);

  return (
    <div className="container py-8">
      <div className="mx-auto max-w-2xl">
        <Card className="border-sage/30 bg-sage/5">
          <CardContent className="flex flex-col items-center p-12 text-center">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-sage/20">
              <CheckCircle2 className="h-12 w-12 text-sage" />
            </div>
            <h1 className="mb-3 font-serif text-3xl font-bold text-foreground">
              Payment Successful!
            </h1>
            <p className="mb-8 text-lg text-muted-foreground">
              Thank you for your purchase. Your order has been confirmed and will be processed shortly.
            </p>
            <div className="flex gap-4">
              <Button
                onClick={() => navigate({ to: '/' })}
                className="bg-terracotta hover:bg-terracotta/90"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Continue Shopping
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
