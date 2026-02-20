import { useNavigate } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { XCircle, ArrowLeft, ShoppingCart } from 'lucide-react';

export default function PaymentFailure() {
  const navigate = useNavigate();

  return (
    <div className="container py-8">
      <div className="mx-auto max-w-2xl">
        <Card className="border-terracotta/30 bg-terracotta/5">
          <CardContent className="flex flex-col items-center p-12 text-center">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-terracotta/20">
              <XCircle className="h-12 w-12 text-terracotta" />
            </div>
            <h1 className="mb-3 font-serif text-3xl font-bold text-foreground">
              Payment Cancelled
            </h1>
            <p className="mb-2 text-lg text-muted-foreground">
              Your payment was not completed. No charges have been made to your account.
            </p>
            <p className="mb-8 text-sm text-muted-foreground">
              If you experienced any issues, please try again or contact our support team.
            </p>
            <div className="flex gap-4">
              <Button
                onClick={() => navigate({ to: '/cart' })}
                className="bg-terracotta hover:bg-terracotta/90"
              >
                <ShoppingCart className="mr-2 h-4 w-4" />
                Return to Cart
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate({ to: '/' })}
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
