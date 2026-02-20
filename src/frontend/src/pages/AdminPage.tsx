import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import BatchUploader from '../components/BatchUploader';
import SingleProductUploader from '../components/SingleProductUploader';
import StripeConfigForm from '../components/StripeConfigForm';
import SettingsForm from '../components/SettingsForm';
import AdminManager from '../components/AdminManager';
import { Package, CreditCard, Settings, Shield, Plus } from 'lucide-react';

export default function AdminPage() {
  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="mb-2 font-serif text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Manage your products, upload new items, and configure payment settings.
        </p>
      </div>

      <Tabs defaultValue="add-product" className="w-full">
        <TabsList className="grid w-full max-w-4xl grid-cols-5">
          <TabsTrigger value="add-product" className="gap-2">
            <Plus className="h-4 w-4" />
            Add Product
          </TabsTrigger>
          <TabsTrigger value="batch-upload" className="gap-2">
            <Package className="h-4 w-4" />
            Batch Upload
          </TabsTrigger>
          <TabsTrigger value="payment" className="gap-2">
            <CreditCard className="h-4 w-4" />
            Payment
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
          <TabsTrigger value="admins" className="gap-2">
            <Shield className="h-4 w-4" />
            Admins
          </TabsTrigger>
        </TabsList>

        <TabsContent value="add-product" className="mt-6">
          <SingleProductUploader />
        </TabsContent>

        <TabsContent value="batch-upload" className="mt-6">
          <BatchUploader />
        </TabsContent>

        <TabsContent value="payment" className="mt-6">
          <StripeConfigForm />
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <SettingsForm />
        </TabsContent>

        <TabsContent value="admins" className="mt-6">
          <AdminManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}
