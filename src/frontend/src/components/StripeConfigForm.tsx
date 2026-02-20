import { useState, useEffect } from 'react';
import { useActor } from '../hooks/useActor';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import type { StripeConfiguration } from '../backend';

export default function StripeConfigForm() {
  const { actor, isFetching: actorFetching } = useActor();
  const [secretKey, setSecretKey] = useState('');
  const [allowedCountries, setAllowedCountries] = useState('US, CA, GB');

  const { data: isConfigured, isLoading: checkingConfig } = useQuery({
    queryKey: ['stripeConfigured'],
    queryFn: async () => {
      if (!actor) return false;
      return actor.isStripeConfigured();
    },
    enabled: !!actor && !actorFetching,
  });

  const setConfigMutation = useMutation({
    mutationFn: async (config: StripeConfiguration) => {
      if (!actor) throw new Error('Actor not available');
      await actor.setStripeConfiguration(config);
    },
    onSuccess: () => {
      toast.success('Stripe configuration saved successfully');
      setSecretKey('');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to save Stripe configuration');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!secretKey.trim()) {
      toast.error('Please enter your Stripe secret key');
      return;
    }

    const countries = allowedCountries
      .split(',')
      .map((c) => c.trim().toUpperCase())
      .filter((c) => c.length === 2);

    if (countries.length === 0) {
      toast.error('Please enter at least one valid country code (e.g., US, CA, GB)');
      return;
    }

    setConfigMutation.mutate({
      secretKey: secretKey.trim(),
      allowedCountries: countries,
    });
  };

  const isLoading = actorFetching || checkingConfig;

  return (
    <Card className="mx-auto max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Payment Settings
          {isConfigured && <CheckCircle2 className="h-5 w-5 text-sage" />}
        </CardTitle>
        <CardDescription>
          Configure Stripe to accept credit and debit card payments from your customers.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-sage" />
          </div>
        ) : (
          <>
            {isConfigured && (
              <Alert className="mb-6 border-sage/30 bg-sage/10">
                <CheckCircle2 className="h-4 w-4 text-sage" />
                <AlertDescription>
                  Stripe is configured and ready to accept payments. You can update your settings below.
                </AlertDescription>
              </Alert>
            )}

            {!isConfigured && (
              <Alert className="mb-6 border-terracotta/30 bg-terracotta/10">
                <AlertCircle className="h-4 w-4 text-terracotta" />
                <AlertDescription>
                  Stripe is not configured yet. Please enter your API credentials to enable payments.
                </AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="secretKey">Stripe Secret Key</Label>
                <Input
                  id="secretKey"
                  type="password"
                  placeholder="sk_test_..."
                  value={secretKey}
                  onChange={(e) => setSecretKey(e.target.value)}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Your secret key from the Stripe Dashboard. It will be stored securely.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="countries">Allowed Countries</Label>
                <Input
                  id="countries"
                  type="text"
                  placeholder="US, CA, GB"
                  value={allowedCountries}
                  onChange={(e) => setAllowedCountries(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Comma-separated list of 2-letter country codes (e.g., US, CA, GB, DE, FR).
                </p>
              </div>

              <Button
                type="submit"
                disabled={setConfigMutation.isPending}
                className="w-full bg-terracotta hover:bg-terracotta/90"
              >
                {setConfigMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Configuration'
                )}
              </Button>
            </form>
          </>
        )}
      </CardContent>
    </Card>
  );
}
