import { useState, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Loader2, ShoppingCart, Edit, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import { useCreateCheckoutSession } from '../hooks/useCheckout';
import { useCart } from '../hooks/useCart';
import { useStripeConfigured, useUpdateProductImage } from '../hooks/useQueries';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useActor } from '../hooks/useActor';
import type { Product, ShoppingItem } from '../backend';

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const createCheckoutSession = useCreateCheckoutSession();
  const { addToBasket, isAddingToBasket } = useCart();
  const { data: isStripeConfigured } = useStripeConfigured();
  const { identity } = useInternetIdentity();
  const { actor } = useActor();
  const updateImageMutation = useUpdateProductImage();
  
  const [isBuyingNow, setIsBuyingNow] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const priceInDollars = Number(product.price) / 100;

  // Check if user is admin
  useState(() => {
    const checkAdmin = async () => {
      if (actor && identity) {
        try {
          const adminStatus = await actor.isCallerAdmin();
          setIsAdmin(adminStatus);
        } catch (error) {
          setIsAdmin(false);
        }
      }
    };
    checkAdmin();
  });

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

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    setSelectedImage(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const clearImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUpdateImage = async () => {
    if (!selectedImage) {
      toast.error('Please select an image');
      return;
    }

    try {
      setUploadProgress(0);
      await updateImageMutation.mutateAsync({
        productId: product.id,
        newImage: selectedImage,
        onProgress: (percentage) => setUploadProgress(percentage),
      });
      
      toast.success('Product image updated successfully');
      setIsEditDialogOpen(false);
      clearImage();
      setUploadProgress(0);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update product image');
    }
  };

  const handleEditClick = () => {
    setIsEditDialogOpen(true);
    clearImage();
    setUploadProgress(0);
  };

  return (
    <>
      <Card className="group relative overflow-hidden border-sage/20 transition-all hover:shadow-lg">
        {isAdmin && identity && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleEditClick}
            className="absolute right-2 top-2 z-10 h-8 w-8 rounded-full bg-white/90 p-0 opacity-0 shadow-md transition-opacity hover:bg-white group-hover:opacity-100"
          >
            <Edit className="h-4 w-4 text-terracotta" />
          </Button>
        )}
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

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-terracotta">Update Product Image</DialogTitle>
            <DialogDescription>
              Replace the image for {product.name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Current Image</Label>
              <div className="aspect-square w-full overflow-hidden rounded-lg border border-sage/20 bg-cream/30">
                <img
                  src={product.image.getDirectURL()}
                  alt={product.name}
                  className="h-full w-full object-cover"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-image">New Image</Label>
              <Input
                ref={fileInputRef}
                id="new-image"
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                disabled={updateImageMutation.isPending}
                className="border-sage/30 focus-visible:ring-sage"
              />
              <p className="text-xs text-muted-foreground">
                Maximum file size: 5MB. Supported formats: JPG, PNG, GIF, WebP
              </p>
            </div>

            {imagePreview && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Preview</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearImage}
                    disabled={updateImageMutation.isPending}
                    className="h-6 px-2 text-xs"
                  >
                    <X className="mr-1 h-3 w-3" />
                    Clear
                  </Button>
                </div>
                <div className="aspect-square w-full overflow-hidden rounded-lg border border-sage/20 bg-cream/30">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="h-full w-full object-cover"
                  />
                </div>
              </div>
            )}

            {updateImageMutation.isPending && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Uploading...</span>
                  <span className="font-medium text-sage">{Math.round(uploadProgress)}%</span>
                </div>
                <Progress value={uploadProgress} className="h-2" />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              disabled={updateImageMutation.isPending}
              className="border-sage/30"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateImage}
              disabled={!selectedImage || updateImageMutation.isPending}
              className="bg-terracotta hover:bg-terracotta/90"
            >
              {updateImageMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Update Image
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
