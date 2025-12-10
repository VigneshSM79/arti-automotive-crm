import { supabase } from '@/integrations/supabase/client';

export interface ExistingLead {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string | null;
  status: string;
  owner_id: string | null;
  created_at: string;
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  existingLead?: ExistingLead;
}

/**
 * Check if a phone number already exists in the database
 * @param phone - Phone number in E.164 format (+1XXXXXXXXXX)
 * @returns Promise with isDuplicate flag and existing lead details if found
 */
export async function checkDuplicatePhone(
  phone: string
): Promise<DuplicateCheckResult> {
  try {
    const { data, error } = await supabase
      .from('leads')
      .select('id, first_name, last_name, phone, email, status, owner_id, created_at')
      .eq('phone', phone)
      .maybeSingle();

    if (error) {
      return { isDuplicate: false };
    }

    return {
      isDuplicate: !!data,
      existingLead: data || undefined,
    };
  } catch (error) {
    return { isDuplicate: false };
  }
}

/**
 * Normalize phone number to E.164 format (+1XXXXXXXXXX)
 * @param phone - Raw phone input (can be "7785552345", "778-555-2345", etc.)
 * @returns Phone in E.164 format or original if invalid
 */
export function normalizePhoneNumber(phone: string): string {
  // Remove all non-digit characters except +
  const cleaned = phone.replace(/[^\d+]/g, '');

  // Handle different formats
  if (cleaned.startsWith('+1') && cleaned.length === 12) {
    return cleaned; // Already E.164: +1XXXXXXXXXX
  } else if (cleaned.startsWith('+1')) {
    // Has +1 but wrong length - strip and reprocess
    return normalizePhoneNumber(cleaned.substring(2));
  } else if (cleaned.startsWith('1') && cleaned.length === 11) {
    return `+${cleaned}`; // 1XXXXXXXXXX -> +1XXXXXXXXXX
  } else if (cleaned.length === 10) {
    return `+1${cleaned}`; // XXXXXXXXXX -> +1XXXXXXXXXX
  } else {
    // Invalid format - return as-is, will fail validation
    return phone;
  }
}

/**
 * Validate phone number format
 * @param phone - Phone number to validate
 * @returns Error message if invalid, empty string if valid
 */
export function validatePhoneNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '');

  if (digits.length === 0) {
    return 'Phone number is required';
  }

  if (digits.length !== 10) {
    return 'Phone number must be exactly 10 digits';
  }

  return ''; // Valid
}
