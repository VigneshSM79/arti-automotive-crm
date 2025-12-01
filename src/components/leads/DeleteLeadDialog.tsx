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

interface DeleteLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  leadCount: number;
  leadNames?: string[]; // Optional: names of leads being deleted
  isDeleting?: boolean;
}

export function DeleteLeadDialog({
  open,
  onOpenChange,
  onConfirm,
  leadCount,
  leadNames,
  isDeleting = false,
}: DeleteLeadDialogProps) {
  const isBulk = leadCount > 1;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-6 w-6 text-destructive" />
            <AlertDialogTitle className="text-xl">
              {isBulk ? `Delete ${leadCount} Leads?` : 'Delete Lead?'}
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-base space-y-2">
            <p>
              {isBulk
                ? `Are you sure you want to delete ${leadCount} leads? This will permanently remove:`
                : 'Are you sure you want to delete this lead? This will permanently remove:'}
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Lead contact information</li>
              <li>All conversations and message history</li>
              <li>Pipeline stage assignments</li>
              <li>Campaign enrollments</li>
            </ul>
            {leadNames && leadNames.length > 0 && leadNames.length <= 5 && (
              <div className="mt-3 p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium mb-1">Leads to be deleted:</p>
                <ul className="text-sm space-y-1">
                  {leadNames.map((name, idx) => (
                    <li key={idx} className="text-muted-foreground">
                      • {name}
                    </li>
                  ))}
                </ul>
              </div>
            )}
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
            {isDeleting ? 'Deleting...' : isBulk ? `Delete ${leadCount} Leads` : 'Delete Lead'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
