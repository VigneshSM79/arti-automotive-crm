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
import { AlertTriangle } from 'lucide-react';

interface DeleteUserDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
    userName?: string;
    isDeleting?: boolean;
}

export function DeleteUserDialog({
    open,
    onOpenChange,
    onConfirm,
    userName,
    isDeleting = false,
}: DeleteUserDialogProps) {
    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent className="max-w-md">
                <AlertDialogHeader>
                    <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="h-6 w-6 text-destructive" />
                        <AlertDialogTitle className="text-xl">
                            Delete User?
                        </AlertDialogTitle>
                    </div>
                    <AlertDialogDescription className="text-base space-y-2">
                        <p>
                            Are you sure you want to delete {userName ? `"${userName}"` : 'this user'}? This will permanently remove:
                        </p>
                        <ul className="list-disc list-inside space-y-1 text-sm">
                            <li>User account and authentication</li>
                            <li>All assigned leads and ownership</li>
                            <li>User role and permissions</li>
                            <li>Notification settings</li>
                        </ul>
                        <p className="text-destructive font-semibold mt-3">
                            ⚠️ This action cannot be undone!
                        </p>
                    </AlertDialogDescription>
                </AlertDialogHeader>

                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={(e) => {
                            e.preventDefault();
                            onConfirm();
                        }}
                        disabled={isDeleting}
                        className="bg-destructive hover:bg-destructive/90"
                    >
                        {isDeleting ? 'Deleting...' : 'Delete User'}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
