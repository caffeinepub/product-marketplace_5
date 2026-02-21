import { useState, useRef, useEffect } from 'react';
import { useAddProduct } from '../hooks/useQueries';
import { usePriceConstraint } from '../hooks/usePriceConstraints';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Upload, Loader2, Image as ImageIcon, X, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { ExternalBlob } from '../backend';
import CategorySelector from './CategorySelector';

export default function SingleProductUploader() {
  const [productName, setProductName] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [priceError, setPriceError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addProductMutation = useAddProduct();
  const { data: priceConstraint } = usePriceConstraint(selectedCategory);

  // Validate price against constraint whenever price or category changes
  useEffect(() => {
    if (!productPrice || !priceConstraint) {
      setPriceError(null);
      return;
    }

    const price = parseFloat(productPrice);
    const minPrice = parseFloat(priceConstraint.minPrice);

    if (price < minPrice) {
      setPriceError(`Price must be at least $${priceConstraint.minPrice} for this category`);
    } else {
      setPriceError(null);
    }
  }, [productPrice, priceConstraint]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!productName.trim()) {
      toast.error('Please enter a product name');
      return;
    }

    if (!productPrice || parseFloat(productPrice) <= 0) {
      toast.error('Please enter a valid price');
      return;
    }

    if (!selectedCategory) {
      toast.error('Please select a category');
      return;
    }

    if (!selectedImage) {
      toast.error('Please select an image');
      return;
    }

    // Check price constraint
    if (priceError) {
      toast.error(priceError);
      return;
    }

    try {
      setUploadProgress(0);

      // Convert File to Uint8Array
      const arrayBuffer = await selectedImage.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      // Create ExternalBlob with progress tracking
      const blob = ExternalBlob.fromBytes(uint8Array).withUploadProgress((percentage) => {
        setUploadProgress(percentage);
      });

      const priceInCents = BigInt(Math.round(parseFloat(productPrice) * 100));

      await addProductMutation.mutateAsync({
        name: productName,
        price: priceInCents,
        image: blob,
        categoryId: selectedCategory,
      });

      toast.success('Product added successfully');

      // Reset form
      setProductName('');
      setProductPrice('');
      setSelectedCategory('');
      clearImage();
      setUploadProgress(0);
    } catch (error: any) {
      console.error('Error adding product:', error);
      toast.error(error.message || 'Failed to add product');
    }
  };

  return (
    <Card className="border-sage/20">
      <CardHeader>
        <CardTitle className="font-serif text-terracotta">Add Single Product</CardTitle>
        <CardDescription>Upload a product with image, name, price, and category</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="product-name">Product Name</Label>
            <Input
              id="product-name"
              placeholder="Enter product name"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              disabled={addProductMutation.isPending}
              className="border-sage/30 focus-visible:ring-sage"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="product-price">Price ($)</Label>
            <Input
              id="product-price"
              type="number"
              placeholder="0.00"
              value={productPrice}
              onChange={(e) => setProductPrice(e.target.value)}
              disabled={addProductMutation.isPending}
              className={`border-sage/30 focus-visible:ring-sage ${priceError ? 'border-destructive' : ''}`}
              step="0.01"
              min="0"
            />
            {priceError && (
              <div className="flex items-center gap-1 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                <span>{priceError}</span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <CategorySelector
              value={selectedCategory}
              onValueChange={setSelectedCategory}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="product-image">Product Image</Label>
            <Input
              ref={fileInputRef}
              id="product-image"
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              disabled={addProductMutation.isPending}
              className="border-sage/30 focus-visible:ring-sage"
            />
            <p className="text-xs text-muted-foreground">
              Maximum file size: 5MB. Supported formats: JPG, PNG, GIF, WebP
            </p>
          </div>

          {imagePreview && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Image Preview</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clearImage}
                  disabled={addProductMutation.isPending}
                  className="h-8 px-2 text-xs"
                >
                  <X className="mr-1 h-3 w-3" />
                  Clear
                </Button>
              </div>
              <div className="flex h-48 w-full items-center justify-center overflow-hidden rounded-lg border border-sage/20 bg-cream/30">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="h-full w-full object-contain"
                />
              </div>
            </div>
          )}

          {addProductMutation.isPending && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Uploading product...</span>
                <span className="font-medium text-sage">{Math.round(uploadProgress)}%</span>
              </div>
              <Progress value={uploadProgress} className="h-2" />
            </div>
          )}

          <Button
            type="submit"
            disabled={addProductMutation.isPending || !productName || !productPrice || !selectedCategory || !selectedImage || !!priceError}
            className="w-full bg-terracotta hover:bg-terracotta/90"
          >
            {addProductMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Add Product
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
