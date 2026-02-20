import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useSettingsQuery, useUpdateSettings } from '../hooks/useSettings';
import { Currency } from '../backend';

export default function SettingsForm() {
  const { data: settings, isLoading, isFetched } = useSettingsQuery();
  const updateSettings = useUpdateSettings();

  const [storeName, setStoreName] = useState('');
  const [storeDescription, setStoreDescription] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [currency, setCurrency] = useState<Currency>(Currency.usd);
  const [taxRate, setTaxRate] = useState('0');
  const [taxError, setTaxError] = useState('');

  useEffect(() => {
    if (settings) {
      setStoreName(settings.storeName);
      setStoreDescription(settings.storeDescription);
      setContactEmail(settings.contactEmail);
      setCurrency(settings.currency);
      setTaxRate(settings.taxRate.toString());
    }
  }, [settings]);

  const validateTaxRate = (value: string): boolean => {
    if (value === '' || value === '0') {
      setTaxError('');
      return true;
    }

    const numValue = parseFloat(value);
    if (isNaN(numValue)) {
      setTaxError('Please enter a valid number');
      return false;
    }

    if (numValue < 0 || numValue > 100) {
      setTaxError('Tax rate must be between 0 and 100');
      return false;
    }

    setTaxError('');
    return true;
  };

  const handleTaxRateChange = (value: string) => {
    setTaxRate(value);
    validateTaxRate(value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!storeName.trim()) {
      toast.error('Please enter a store name');
      return;
    }

    if (!contactEmail.trim()) {
      toast.error('Please enter a contact email');
      return;
    }

    if (!validateTaxRate(taxRate)) {
      return;
    }

    const taxRateValue = taxRate === '' ? 0 : parseFloat(taxRate);

    updateSettings.mutate(
      {
        storeName: storeName.trim(),
        storeDescription: storeDescription.trim(),
        contactEmail: contactEmail.trim(),
        currency,
        taxRate: taxRateValue,
      },
      {
        onSuccess: () => {
          toast.success('Settings saved successfully');
        },
        onError: (error: any) => {
          toast.error(error.message || 'Failed to save settings');
        },
      }
    );
  };

  return (
    <Card className="mx-auto max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Store Settings
          {settings && <CheckCircle2 className="h-5 w-5 text-sage" />}
        </CardTitle>
        <CardDescription>
          Configure your store's general information, currency, and tax settings.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-sage" />
          </div>
        ) : (
          <>
            {!settings && isFetched && (
              <Alert className="mb-6 border-terracotta/30 bg-terracotta/10">
                <AlertCircle className="h-4 w-4 text-terracotta" />
                <AlertDescription>
                  Store settings have not been configured yet. Please fill in the form below.
                </AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="storeName">Store Name</Label>
                <Input
                  id="storeName"
                  type="text"
                  placeholder="My Awesome Store"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  The name of your store as it appears to customers.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="storeDescription">Store Description</Label>
                <Textarea
                  id="storeDescription"
                  placeholder="Tell customers about your store..."
                  value={storeDescription}
                  onChange={(e) => setStoreDescription(e.target.value)}
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  A brief description of your store and what you offer.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactEmail">Contact Email</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  placeholder="contact@example.com"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Email address for customer inquiries and support.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Select value={currency} onValueChange={(value) => setCurrency(value as Currency)}>
                  <SelectTrigger id="currency">
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={Currency.usd}>USD - US Dollar</SelectItem>
                    <SelectItem value={Currency.eur}>EUR - Euro</SelectItem>
                    <SelectItem value={Currency.gbp}>GBP - British Pound</SelectItem>
                    <SelectItem value={Currency.cad}>CAD - Canadian Dollar</SelectItem>
                    <SelectItem value={Currency.aud}>AUD - Australian Dollar</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  The currency used for product pricing throughout your store.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="taxRate">Tax Rate (%)</Label>
                <Input
                  id="taxRate"
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  placeholder="0"
                  value={taxRate}
                  onChange={(e) => handleTaxRateChange(e.target.value)}
                  className={taxError ? 'border-destructive' : ''}
                />
                {taxError && (
                  <p className="text-xs text-destructive">{taxError}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Tax rate applied to orders (e.g., 8.5 for 8.5%). Set to 0 to disable tax.
                </p>
              </div>

              <Button
                type="submit"
                disabled={updateSettings.isPending || !!taxError}
                className="w-full bg-terracotta hover:bg-terracotta/90"
              >
                {updateSettings.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Settings'
                )}
              </Button>
            </form>
          </>
        )}
      </CardContent>
    </Card>
  );
}
