import { useState } from 'react';
import { useAdmins, useAddAdmin, useRemoveAdmin } from '../hooks/useAdminManagement';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { Principal } from '@dfinity/principal';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { UserPlus, Trash2, Shield } from 'lucide-react';

export default function AdminManager() {
  const { data: admins, isLoading } = useAdmins();
  const { identity } = useInternetIdentity();
  const addAdmin = useAddAdmin();
  const removeAdmin = useRemoveAdmin();

  const [principalInput, setPrincipalInput] = useState('');
  const [adminToRemove, setAdminToRemove] = useState<Principal | null>(null);

  const currentUserPrincipal = identity?.getPrincipal().toString();

  const handleAddAdmin = async () => {
    if (!principalInput.trim()) {
      toast.error('Please enter a principal ID');
      return;
    }

    try {
      const principal = Principal.fromText(principalInput.trim());
      await addAdmin.mutateAsync(principal);
      toast.success('Admin added successfully');
      setPrincipalInput('');
    } catch (error: any) {
      if (error.message?.includes('Invalid principal')) {
        toast.error('Invalid principal ID format');
      } else if (error.message?.includes('already')) {
        toast.error('This principal is already an admin');
      } else {
        toast.error(error.message || 'Failed to add admin');
      }
    }
  };

  const handleRemoveAdmin = async () => {
    if (!adminToRemove) return;

    try {
      await removeAdmin.mutateAsync(adminToRemove);
      toast.success('Admin removed successfully');
      setAdminToRemove(null);
    } catch (error: any) {
      toast.error(error.message || 'Failed to remove admin');
      setAdminToRemove(null);
    }
  };

  const isCurrentUser = (principal: Principal) => {
    return principal.toString() === currentUserPrincipal;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Admin Management
          </CardTitle>
          <CardDescription>
            Manage administrator access for your artisan marketplace. Admins can manage products,
            categories, and settings.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Add Admin Form */}
          <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
            <div className="space-y-2">
              <Label htmlFor="principal-input">Add New Admin</Label>
              <div className="flex gap-2">
                <Input
                  id="principal-input"
                  placeholder="Enter principal ID (e.g., xxxxx-xxxxx-xxxxx-xxxxx-xxx)"
                  value={principalInput}
                  onChange={(e) => setPrincipalInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleAddAdmin();
                    }
                  }}
                  disabled={addAdmin.isPending}
                />
                <Button
                  onClick={handleAddAdmin}
                  disabled={addAdmin.isPending || !principalInput.trim()}
                  className="gap-2"
                >
                  <UserPlus className="h-4 w-4" />
                  {addAdmin.isPending ? 'Adding...' : 'Add Admin'}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Enter the Internet Identity principal of the user you want to grant admin access.
              </p>
            </div>
          </div>

          {/* Admin List */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Current Administrators</h3>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : admins && admins.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Principal ID</TableHead>
                      <TableHead className="w-[100px]">Status</TableHead>
                      <TableHead className="w-[100px] text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {admins.map((admin) => (
                      <TableRow key={admin.toString()}>
                        <TableCell className="font-mono text-xs">
                          {admin.toString()}
                        </TableCell>
                        <TableCell>
                          {isCurrentUser(admin) && (
                            <Badge variant="secondary" className="gap-1">
                              <Shield className="h-3 w-3" />
                              You
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setAdminToRemove(admin)}
                            disabled={isCurrentUser(admin) || removeAdmin.isPending}
                            className="gap-1 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                            Remove
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="rounded-md border border-dashed p-8 text-center">
                <Shield className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <p className="mt-2 text-sm text-muted-foreground">No administrators found</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Remove Confirmation Dialog */}
      <AlertDialog open={!!adminToRemove} onOpenChange={() => setAdminToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Admin Access</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to revoke admin access for this principal? They will no longer
              be able to manage products, categories, or settings.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveAdmin}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove Admin
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
