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
import { Badge } from '@/components/ui/badge';
import { ExistingLead } from '@/lib/duplicatePhoneCheck';
import { formatDistanceToNow } from 'date-fns';
import { Phone, Mail, User, Calendar, AlertTriangle } from 'lucide-react';

interface DuplicateContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingLead: ExistingLead;
  onViewExisting?: () => void;
}

export function DuplicateContactDialog({
  open,
  onOpenChange,
  existingLead,
  onViewExisting,
}: DuplicateContactDialogProps) {
  const formatPhone = (phone: string) => {
    // Format +17785552345 -> (778) 555-2345
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 11 && digits.startsWith('1')) {
      const areaCode = digits.slice(1, 4);
      const prefix = digits.slice(4, 7);
      const line = digits.slice(7);
      return `(${areaCode}) ${prefix}-${line}`;
    }
    return phone;
  };

  const getOwnerStatus = () => {
    if (existingLead.owner_id) {
      return 'Claimed by agent';
    }
    return 'Unassigned (in Lead Pool)';
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-6 w-6 text-orange-500" />
            <AlertDialogTitle className="text-xl">
              Duplicate Contact Detected
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-base">
            This phone number already exists in your system:
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          {/* Phone Number */}
          <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
            <Phone className="h-5 w-5 text-orange-600" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Phone Number</p>
              <p className="text-lg font-semibold text-orange-700">
                {formatPhone(existingLead.phone)}
              </p>
            </div>
          </div>

          {/* Contact Name */}
          <div className="flex items-start gap-3">
            <User className="h-5 w-5 text-gray-500 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Contact Name</p>
              <p className="text-base font-semibold">
                {existingLead.first_name} {existingLead.last_name}
              </p>
            </div>
          </div>

          {/* Email */}
          {existingLead.email && (
            <div className="flex items-start gap-3">
              <Mail className="h-5 w-5 text-gray-500 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-muted-foreground">Email</p>
                <p className="text-base truncate">{existingLead.email}</p>
              </div>
            </div>
          )}

          {/* Status & Owner */}
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-sm">
              {existingLead.status}
            </Badge>
            <Badge variant="secondary" className="text-sm">
              {getOwnerStatus()}
            </Badge>
          </div>

          {/* Created Date */}
          <div className="flex items-start gap-3">
            <Calendar className="h-5 w-5 text-gray-500 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Created</p>
              <p className="text-base">
                {formatDistanceToNow(new Date(existingLead.created_at), { addSuffix: true })}
              </p>
            </div>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          {onViewExisting && (
            <AlertDialogAction onClick={onViewExisting}>
              View Existing Contact
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
