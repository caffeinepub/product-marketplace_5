import { useState, useRef, useEffect } from 'react';
import { useCategories, useStartBatchUpload, useUploadProductImage, useFinishBatchUpload } from '../hooks/useQueries';
import { usePriceConstraint } from '../hooks/usePriceConstraints';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Upload, Loader2, CheckCircle2, XCircle, Image as ImageIcon, AlertCircle, Info } from 'lucide-react';
import { toast } from 'sonner';
import { ExternalBlob } from '../backend';

interface UploadedProduct {
  name: string;
  price: number;
  image: File;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
  priceError?: string;
}

export default function BatchUploader() {
  const [selectedCategory, setSelectedCategory] = useState('');
  const [products, setProducts] = useState<UploadedProduct[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: categories = [], isLoading: categoriesLoading } = useCategories();
  const startBatchMutation = useStartBatchUpload();
  const uploadProductMutation = useUploadProductImage();
  const finishBatchMutation = useFinishBatchUpload();
  const { data: priceConstraint } = usePriceConstraint(selectedCategory);

  // Validate prices whenever category or products change
  useEffect(() => {
    if (!priceConstraint) {
      // Clear all price errors
      setProducts((prev) =>
        prev.map((p) => ({ ...p, priceError: undefined }))
      );
      return;
    }

    const minPrice = parseFloat(priceConstraint.minPrice);
    setProducts((prev) =>
      prev.map((p) => ({
        ...p,
        priceError: p.price > 0 && p.price < minPrice
          ? `Min $${priceConstraint.minPrice}`
          : undefined,
      }))
    );
  }, [priceConstraint, selectedCategory]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const imageFiles = files.filter((file) => file.type.startsWith('image/'));

    if (imageFiles.length === 0) {
      toast.error('Please select image files');
      return;
    }

    const newProducts: UploadedProduct[] = imageFiles.map((file) => ({
      name: file.name.replace(/\.[^/.]+$/, ''),
      price: 0,
      image: file,
      status: 'pending',
    }));

    setProducts((prev) => [...prev, ...newProducts]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const updateProduct = (index: number, updates: Partial<UploadedProduct>) => {
    setProducts((prev) => prev.map((p, i) => (i === index ? { ...p, ...updates } : p)));
  };

  const removeProduct = (index: number) => {
    setProducts((prev) => prev.filter((_, i) => i !== index));
  };

  const handleBatchUpload = async () => {
    if (!selectedCategory) {
      toast.error('Please select a category');
      return;
    }

    if (products.length === 0) {
      toast.error('Please add at least one product');
      return;
    }

    const invalidProducts = products.filter((p) => !p.name.trim() || p.price <= 0);
    if (invalidProducts.length > 0) {
      toast.error('All products must have a name and price greater than 0');
      return;
    }

    // Check for price constraint violations
    const priceViolations = products.filter((p) => p.priceError);
    if (priceViolations.length > 0) {
      toast.error(`${priceViolations.length} product(s) have prices below the minimum for this category`);
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Determine the full category path
      let categoryPath = selectedCategory;
      const selectedCat = categories.find((c) => c.name === selectedCategory);
      
      // If it's a parent with subcategories, we need to pick the first subcategory or use parent name
      if (selectedCat && selectedCat.subcategories.length > 0) {
        // For batch upload, if parent is selected, use just the parent name
        categoryPath = selectedCategory;
      }

      await startBatchMutation.mutateAsync(categoryPath);

      for (let i = 0; i < products.length; i++) {
        const product = products[i];
        updateProduct(i, { status: 'uploading' });

        try {
          const arrayBuffer = await product.image.arrayBuffer();
          const uint8Array = new Uint8Array(arrayBuffer);
          const blob = ExternalBlob.fromBytes(uint8Array);

          await uploadProductMutation.mutateAsync({
            name: product.name,
            image: blob,
            price: BigInt(Math.round(product.price * 100)),
            category: categoryPath,
          });

          updateProduct(i, { status: 'success' });
          setUploadProgress(((i + 1) / products.length) * 100);
        } catch (error: any) {
          updateProduct(i, { status: 'error', error: error.message });
        }
      }

      await finishBatchMutation.mutateAsync();
      toast.success(`Successfully uploaded ${products.filter((p) => p.status === 'success').length} products`);

      // Clear successful uploads
      setProducts((prev) => prev.filter((p) => p.status === 'error'));
      setSelectedCategory('');
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload products');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const getCategoryOptions = () => {
    const options: { value: string; label: string; isParent: boolean }[] = [];
    
    categories.forEach((category) => {
      if (category.subcategories.length === 0) {
        // Parent with no subcategories
        options.push({ value: category.name, label: category.name, isParent: true });
      } else {
        // Parent with subcategories
        options.push({ value: category.name, label: category.name, isParent: true });
        category.subcategories.forEach((sub) => {
          options.push({
            value: `${category.name} > ${sub}`,
            label: `${category.name} > ${sub}`,
            isParent: false,
          });
        });
      }
    });
    
    return options;
  };

  const categoryOptions = getCategoryOptions();

  return (
    <Card className="border-sage/20">
      <CardHeader>
        <CardTitle className="font-serif text-terracotta">Batch Product Upload</CardTitle>
        <CardDescription>Upload multiple products at once with images and pricing</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="category-select">Select Category</Label>
            <Select
              value={selectedCategory}
              onValueChange={setSelectedCategory}
              disabled={isUploading || categoriesLoading}
            >
              <SelectTrigger id="category-select" className="border-sage/30 focus:ring-sage">
                <SelectValue placeholder="Choose a category" />
              </SelectTrigger>
              <SelectContent>
                {categories.length === 0 ? (
                  <SelectItem value="none" disabled>
                    No categories available
                  </SelectItem>
                ) : (
                  categories.map((category) => (
                    <SelectGroup key={category.name}>
                      <SelectLabel className="font-medium text-terracotta">{category.name}</SelectLabel>
                      <SelectItem value={category.name}>
                        {category.name} (All)
                      </SelectItem>
                      {category.subcategories.map((sub) => (
                        <SelectItem key={`${category.name} > ${sub}`} value={`${category.name} > ${sub}`}>
                          ↳ {sub}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))
                )}
              </SelectContent>
            </Select>
            
            {/* Display minimum price requirement if available */}
            {priceConstraint && (
              <div className="flex items-start gap-2 rounded-md bg-blue-50 p-3 text-sm dark:bg-blue-950/30">
                <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600 dark:text-blue-400" />
                <p className="text-blue-800 dark:text-blue-300">
                  <span className="font-medium">Minimum price for this category:</span> ${priceConstraint.minPrice}
                </p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Add Product Images</Label>
            <div className="flex items-center gap-2">
              <Input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
                disabled={isUploading}
                className="border-sage/30 focus-visible:ring-sage"
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="border-sage/30"
              >
                <Upload className="mr-2 h-4 w-4" />
                Browse
              </Button>
            </div>
          </div>
        </div>

        {products.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Products ({products.length})</h3>
              {!isUploading && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setProducts([])}
                  className="text-destructive hover:text-destructive"
                >
                  Clear All
                </Button>
              )}
            </div>

            <div className="max-h-96 space-y-3 overflow-y-auto rounded-lg border border-sage/20 p-4">
              {products.map((product, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 rounded-lg border border-sage/10 bg-cream/20 p-3"
                >
                  <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded border border-sage/20 bg-white">
                    {product.image ? (
                      <img
                        src={URL.createObjectURL(product.image)}
                        alt={product.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <ImageIcon className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>

                  <div className="flex-1 space-y-2">
                    <Input
                      placeholder="Product name"
                      value={product.name}
                      onChange={(e) => updateProduct(index, { name: e.target.value })}
                      disabled={isUploading}
                      className="border-sage/30 focus-visible:ring-sage"
                    />
                    <div className="space-y-1">
                      <Input
                        type="number"
                        placeholder="Price ($)"
                        value={product.price || ''}
                        onChange={(e) => updateProduct(index, { price: parseFloat(e.target.value) || 0 })}
                        disabled={isUploading}
                        className={`border-sage/30 focus-visible:ring-sage ${product.priceError ? 'border-destructive' : ''}`}
                        step="0.01"
                        min="0"
                      />
                      {product.priceError && (
                        <div className="flex items-center gap-1 text-xs text-destructive">
                          <AlertCircle className="h-3 w-3" />
                          <span>{product.priceError}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-center gap-2">
                    {product.status === 'success' && (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    )}
                    {product.status === 'error' && (
                      <XCircle className="h-5 w-5 text-destructive" />
                    )}
                    {product.status === 'uploading' && (
                      <Loader2 className="h-5 w-5 animate-spin text-sage" />
                    )}
                    {!isUploading && product.status === 'pending' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeProduct(index)}
                        className="h-8 px-2 text-destructive hover:text-destructive"
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {isUploading && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Uploading batch...</span>
                  <span className="font-medium text-sage">{Math.round(uploadProgress)}%</span>
                </div>
                <Progress value={uploadProgress} className="h-2" />
              </div>
            )}

            <Button
              onClick={handleBatchUpload}
              disabled={isUploading || products.length === 0 || !selectedCategory}
              className="w-full bg-terracotta hover:bg-terracotta/90"
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading {products.filter((p) => p.status === 'success').length} of {products.length}...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload {products.length} Product{products.length !== 1 ? 's' : ''}
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
