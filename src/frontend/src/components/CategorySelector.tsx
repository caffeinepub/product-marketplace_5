import { useState } from 'react';
import { useCategories, useAddCategory, useEditCategory, useDeleteCategory } from '../hooks/useQueries';
import { usePriceConstraint } from '../hooks/usePriceConstraints';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Loader2, Edit2, Trash2, Info } from 'lucide-react';
import { toast } from 'sonner';
import type { Category } from '../backend';

interface CategorySelectorProps {
  value: string;
  onValueChange: (value: string) => void;
  label?: string;
  placeholder?: string;
}

const NONE_VALUE = '__none__';

export default function CategorySelector({
  value,
  onValueChange,
  label = 'Category',
  placeholder = 'Select a category',
}: CategorySelectorProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [parentCategory, setParentCategory] = useState<string>(NONE_VALUE);
  const [editTarget, setEditTarget] = useState<Category | null>(null);
  const [editName, setEditName] = useState('');
  const [editParent, setEditParent] = useState<string>(NONE_VALUE);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);

  const { data: categories = [], isLoading } = useCategories();
  const addCategoryMutation = useAddCategory();
  const editCategoryMutation = useEditCategory();
  const deleteCategoryMutation = useDeleteCategory();
  
  // Fetch price constraint for selected category
  const { data: priceConstraint } = usePriceConstraint(value);

  const parseErrorMessage = (error: any): string => {
    console.log('[CategorySelector] Parsing error:', {
      error,
      errorType: typeof error,
      errorMessage: error?.message,
      errorString: String(error),
    });

    // Extract the actual error message from the error object
    let errorMessage = '';
    
    if (error?.message) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    } else {
      errorMessage = String(error);
    }
    
    console.log('[CategorySelector] Extracted error message:', errorMessage);
    
    // Check for specific error patterns
    if (errorMessage.includes('Unauthorized') || errorMessage.includes('Only admins')) {
      return 'Unauthorized: You must be logged in as an admin to add categories.';
    }
    if (errorMessage.includes('empty category name') || errorMessage.includes('Cannot add empty')) {
      return 'Category name cannot be empty. Please enter a valid name.';
    }
    if (errorMessage.includes('already exists')) {
      return 'A category with this name already exists. Please choose a different name.';
    }
    if (errorMessage.includes('Parent category does not exist')) {
      return 'Parent category not found. Please select a valid parent category or refresh the page.';
    }
    if (errorMessage.includes('subcategory within a subcategory')) {
      return 'Cannot create nested subcategories. Only one level of subcategories is supported.';
    }
    if (errorMessage.includes('does not exist')) {
      return 'Category not found. It may have been deleted. Please refresh the page.';
    }
    if (errorMessage.includes('Actor not initialized')) {
      return 'Connection error. Please refresh the page and try again.';
    }
    
    // Return the original error message if no specific pattern matches
    return errorMessage || 'An unexpected error occurred. Please try again.';
  };

  const handleCreateCategory = async () => {
    console.group('🟢 [CategorySelector] handleCreateCategory');
    console.log('⏰ Timestamp:', new Date().toISOString());
    
    if (!newCategoryName.trim()) {
      console.log('❌ Validation failed: empty category name');
      console.groupEnd();
      toast.error('Please enter a category name');
      return;
    }

    console.log('📝 Form values:', {
      newCategoryName: newCategoryName,
      parentCategory: parentCategory,
      parentCategoryType: typeof parentCategory,
      parentCategoryIsNone: parentCategory === NONE_VALUE,
      parentCategoryTrimmed: parentCategory.trim(),
    });

    try {
      // Convert NONE_VALUE to undefined for top-level categories
      const categoryParent = parentCategory === NONE_VALUE || !parentCategory.trim() ? undefined : parentCategory.trim();
      
      const newCategory: Category = {
        name: newCategoryName.trim(),
        subcategories: [],
        parent: categoryParent,
      };

      console.log('🔄 Category object to be sent:', {
        name: newCategory.name,
        parent: newCategory.parent,
        parentType: typeof newCategory.parent,
        parentIsUndefined: newCategory.parent === undefined,
        subcategories: newCategory.subcategories,
      });

      console.log('🚀 Calling addCategoryMutation.mutateAsync...');
      const result = await addCategoryMutation.mutateAsync(newCategory);
      
      console.log('✅ Category creation successful!', {
        result,
        timestamp: new Date().toISOString(),
      });
      toast.success(categoryParent ? 'Subcategory added successfully' : 'Category added successfully');
      
      // Select the newly created category
      onValueChange(newCategoryName.trim());
      
      setNewCategoryName('');
      setParentCategory(NONE_VALUE);
      setShowCreateDialog(false);
      console.groupEnd();
    } catch (error: any) {
      console.error('❌ Category creation failed:', {
        timestamp: new Date().toISOString(),
        error,
        errorMessage: error?.message,
        errorName: error?.name,
        errorStack: error?.stack,
        errorType: typeof error,
        errorKeys: error ? Object.keys(error) : [],
      });
      console.groupEnd();
      
      const friendlyMessage = parseErrorMessage(error);
      console.log('[CategorySelector] Displaying error toast:', friendlyMessage);
      toast.error(friendlyMessage);
    }
  };

  const handleEditCategory = async () => {
    if (!editTarget || !editName.trim()) {
      toast.error('Please enter a category name');
      return;
    }

    try {
      // Convert NONE_VALUE to undefined for top-level categories
      const categoryParent = editParent === NONE_VALUE || !editParent.trim() ? undefined : editParent.trim();
      
      const updatedCategory: Category = {
        name: editName.trim(),
        subcategories: editTarget.subcategories,
        parent: categoryParent,
      };

      await editCategoryMutation.mutateAsync({
        oldName: editTarget.name,
        newCategory: updatedCategory,
      });

      toast.success('Category updated successfully');
      
      // Update selection if the edited category was selected
      if (value === editTarget.name) {
        onValueChange(editName.trim());
      }
      
      setEditTarget(null);
      setEditName('');
      setEditParent(NONE_VALUE);
      setShowEditDialog(false);
    } catch (error: any) {
      const friendlyMessage = parseErrorMessage(error);
      toast.error(friendlyMessage);
    }
  };

  const handleDeleteCategory = async () => {
    if (!deleteTarget) return;

    try {
      await deleteCategoryMutation.mutateAsync(deleteTarget.name);
      toast.success('Category deleted successfully');
      
      // Clear selection if the deleted category was selected
      if (value === deleteTarget.name) {
        onValueChange('');
      }
      
      setDeleteTarget(null);
      setShowDeleteDialog(false);
    } catch (error: any) {
      const friendlyMessage = parseErrorMessage(error);
      toast.error(friendlyMessage);
    }
  };

  const openEditDialog = (category: Category) => {
    setEditTarget(category);
    setEditName(category.name);
    setEditParent(category.parent || NONE_VALUE);
    setShowEditDialog(true);
  };

  const openDeleteDialog = (category: Category) => {
    setDeleteTarget(category);
    setShowDeleteDialog(true);
  };

  const topLevelCategories = categories.filter((c) => !c.parent);

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Select value={value} onValueChange={onValueChange} disabled={isLoading}>
          <SelectTrigger className="flex-1 border-sage/30 focus:ring-sage">
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {categories.length === 0 ? (
              <SelectItem value="none" disabled>
                No categories available
              </SelectItem>
            ) : (
              topLevelCategories.map((category) => (
                <SelectGroup key={category.name}>
                  <SelectLabel className="flex items-center justify-between font-medium text-terracotta">
                    <span>{category.name}</span>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditDialog(category);
                        }}
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          openDeleteDialog(category);
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </SelectLabel>
                  <SelectItem value={category.name}>{category.name}</SelectItem>
                  {category.subcategories.map((sub) => (
                    <SelectItem key={sub} value={sub}>
                      ↳ {sub}
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))
            )}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setShowCreateDialog(true)}
          className="border-sage/30 hover:bg-sage/10"
          disabled={isLoading}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Display minimum price requirement if available */}
      {priceConstraint && (
        <div className="flex items-start gap-2 rounded-md bg-blue-50 p-3 text-sm dark:bg-blue-950/30">
          <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600 dark:text-blue-400" />
          <p className="text-blue-800 dark:text-blue-300">
            <span className="font-medium">Minimum price:</span> ${priceConstraint.minPrice}
          </p>
        </div>
      )}

      {/* Create Category Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Category</DialogTitle>
            <DialogDescription>Add a new category or subcategory to organize your products.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-category-name">Category Name</Label>
              <Input
                id="new-category-name"
                placeholder="e.g., Pottery"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                className="border-sage/30 focus-visible:ring-sage"
                disabled={addCategoryMutation.isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="parent-category">Parent Category (Optional)</Label>
              <Select 
                value={parentCategory} 
                onValueChange={setParentCategory}
                disabled={addCategoryMutation.isPending}
              >
                <SelectTrigger id="parent-category" className="border-sage/30 focus:ring-sage">
                  <SelectValue placeholder="None (top-level category)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_VALUE}>None (top-level category)</SelectItem>
                  {topLevelCategories.map((category) => (
                    <SelectItem key={category.name} value={category.name}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowCreateDialog(false);
                setNewCategoryName('');
                setParentCategory(NONE_VALUE);
              }}
              disabled={addCategoryMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateCategory}
              disabled={addCategoryMutation.isPending || !newCategoryName.trim()}
              className="bg-terracotta hover:bg-terracotta/90"
            >
              {addCategoryMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Category'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Category Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
            <DialogDescription>Update the category name or parent.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-category-name">Category Name</Label>
              <Input
                id="edit-category-name"
                placeholder="e.g., Pottery"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="border-sage/30 focus-visible:ring-sage"
                disabled={editCategoryMutation.isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-parent-category">Parent Category (Optional)</Label>
              <Select 
                value={editParent} 
                onValueChange={setEditParent}
                disabled={editCategoryMutation.isPending}
              >
                <SelectTrigger id="edit-parent-category" className="border-sage/30 focus:ring-sage">
                  <SelectValue placeholder="None (top-level category)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_VALUE}>None (top-level category)</SelectItem>
                  {topLevelCategories
                    .filter((c) => c.name !== editTarget?.name)
                    .map((category) => (
                      <SelectItem key={category.name} value={category.name}>
                        {category.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowEditDialog(false)}
              disabled={editCategoryMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleEditCategory}
              disabled={editCategoryMutation.isPending || !editName.trim()}
              className="bg-terracotta hover:bg-terracotta/90"
            >
              {editCategoryMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Category'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Category Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteTarget?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteCategoryMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCategory}
              disabled={deleteCategoryMutation.isPending}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleteCategoryMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
