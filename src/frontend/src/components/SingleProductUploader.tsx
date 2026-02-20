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

      const arrayBuffer = await selectedImage.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      const blob = ExternalBlob.fromBytes(uint8Array).withUploadProgress((percentage) => {
        setUploadProgress(percentage);
      });

      const priceInCents = BigInt(Math.round(parseFloat(productPrice) * 100));

      await addProductMutation.mutateAsync({
        name: productName.trim(),
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
      setPriceError(null);
    } catch (error: any) {
      toast.error(error.message || 'Failed to add product');
      setUploadProgress(0);
    }
  };

  const isUploading = addProductMutation.isPending;
  const hasValidationError = !!priceError;

  return (
    <Card className="border-sage/20">
      <CardHeader>
        <CardTitle className="font-serif text-terracotta">Add Single Product</CardTitle>
        <CardDescription>Add a new product with image, name, price, and category</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="product-name">Product Name</Label>
              <Input
                id="product-name"
                placeholder="e.g., Handcrafted Ceramic Bowl"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                disabled={isUploading}
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
                disabled={isUploading}
                className={`border-sage/30 focus-visible:ring-sage ${priceError ? 'border-destructive' : ''}`}
                step="0.01"
                min="0"
              />
              {priceError && (
                <div className="flex items-start gap-2 text-sm text-destructive">
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <p>{priceError}</p>
                </div>
              )}
            </div>

            <CategorySelector
              value={selectedCategory}
              onValueChange={setSelectedCategory}
              label="Category"
              placeholder="Select a category"
            />

            <div className="space-y-2">
              <Label>Product Image</Label>
              {imagePreview ? (
                <div className="relative">
                  <div className="overflow-hidden rounded-lg border border-sage/20">
                    <img
                      src={imagePreview}
                      alt="Product preview"
                      className="h-64 w-full object-cover"
                    />
                  </div>
                  {!isUploading && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute right-2 top-2"
                      onClick={clearImage}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4">
                  <div
                    className="flex h-64 w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-sage/30 bg-cream/20 transition-colors hover:border-sage/50 hover:bg-cream/30"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <ImageIcon className="mb-2 h-12 w-12 text-sage/50" />
                    <p className="text-sm text-muted-foreground">Click to upload image</p>
                    <p className="text-xs text-muted-foreground">or drag and drop</p>
                  </div>
                  <Input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    disabled={isUploading}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="border-sage/30"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Browse Files
                  </Button>
                </div>
              )}
            </div>

            {isUploading && uploadProgress > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Uploading...</span>
                  <span className="font-medium text-sage">{Math.round(uploadProgress)}%</span>
                </div>
                <Progress value={uploadProgress} className="h-2" />
              </div>
            )}
          </div>

          <Button
            type="submit"
            disabled={isUploading || !productName.trim() || !productPrice || !selectedCategory || !selectedImage || hasValidationError}
            className="w-full bg-terracotta hover:bg-terracotta/90"
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Adding Product...
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
