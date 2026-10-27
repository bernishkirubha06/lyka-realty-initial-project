export interface Country {
  name: string;
  code: string;
  dialCode: string;
  flag: string;
  placeholder: string;
  minDigits: number;
  maxDigits: number;
}

// Complete Alphabetical (A to Z) Country list with dialing codes, flags & digit rules
export const COUNTRIES: Country[] = [
  { name: "Afghanistan", code: "AF", dialCode: "+93", flag: "🇦🇫", placeholder: "70 123 4567", minDigits: 9, maxDigits: 9 },
  { name: "Albania", code: "AL", dialCode: "+355", flag: "🇦🇱", placeholder: "69 123 4567", minDigits: 8, maxDigits: 9 },
  { name: "Algeria", code: "DZ", dialCode: "+213", flag: "🇩🇿", placeholder: "551 23 45 67", minDigits: 9, maxDigits: 9 },
  { name: "Andorra", code: "AD", dialCode: "+376", flag: "🇦🇩", placeholder: "312 345", minDigits: 6, maxDigits: 9 },
  { name: "Angola", code: "AO", dialCode: "+244", flag: "🇦🇴", placeholder: "923 123 456", minDigits: 9, maxDigits: 9 },
  { name: "Argentina", code: "AR", dialCode: "+54", flag: "🇦🇷", placeholder: "9 11 1234 5678", minDigits: 10, maxDigits: 11 },
  { name: "Armenia", code: "AM", dialCode: "+374", flag: "🇦🇲", placeholder: "77 123456", minDigits: 8, maxDigits: 8 },
  { name: "Australia", code: "AU", dialCode: "+61", flag: "🇦🇺", placeholder: "412 345 678", minDigits: 9, maxDigits: 10 },
  { name: "Austria", code: "AT", dialCode: "+43", flag: "🇦🇹", placeholder: "664 1234567", minDigits: 9, maxDigits: 13 },
  { name: "Azerbaijan", code: "AZ", dialCode: "+994", flag: "🇦🇿", placeholder: "50 123 45 67", minDigits: 9, maxDigits: 9 },
  { name: "Bahamas", code: "BS", dialCode: "+1-242", flag: "🇧🇸", placeholder: "359 1234", minDigits: 7, maxDigits: 10 },
  { name: "Bahrain", code: "BH", dialCode: "+973", flag: "🇧🇭", placeholder: "3912 3456", minDigits: 8, maxDigits: 8 },
  { name: "Bangladesh", code: "BD", dialCode: "+880", flag: "🇧🇩", placeholder: "1712 345678", minDigits: 10, maxDigits: 10 },
  { name: "Belgium", code: "BE", dialCode: "+32", flag: "🇧🇪", placeholder: "470 12 34 56", minDigits: 9, maxDigits: 9 },
  { name: "Brazil", code: "BR", dialCode: "+55", flag: "🇧🇷", placeholder: "11 91234 5678", minDigits: 10, maxDigits: 11 },
  { name: "Canada", code: "CA", dialCode: "+1", flag: "🇨🇦", placeholder: "416 123 4567", minDigits: 10, maxDigits: 10 },
  { name: "China", code: "CN", dialCode: "+86", flag: "🇨🇳", placeholder: "138 0013 8000", minDigits: 11, maxDigits: 11 },
  { name: "Cyprus", code: "CY", dialCode: "+357", flag: "🇨🇾", placeholder: "99 123456", minDigits: 8, maxDigits: 8 },
  { name: "Czech Republic", code: "CZ", dialCode: "+420", flag: "🇨🇿", placeholder: "601 123 456", minDigits: 9, maxDigits: 9 },
  { name: "Denmark", code: "DK", dialCode: "+45", flag: "🇩🇰", placeholder: "20 12 34 56", minDigits: 8, maxDigits: 8 },
  { name: "Egypt", code: "EG", dialCode: "+20", flag: "🇪🇬", placeholder: "100 123 4567", minDigits: 10, maxDigits: 10 },
  { name: "Finland", code: "FI", dialCode: "+358", flag: "🇫🇮", placeholder: "40 1234567", minDigits: 9, maxDigits: 10 },
  { name: "France", code: "FR", dialCode: "+33", flag: "🇫🇷", placeholder: "6 12 34 56 78", minDigits: 9, maxDigits: 9 },
  { name: "Germany", code: "DE", dialCode: "+49", flag: "🇩🇪", placeholder: "151 12345678", minDigits: 10, maxDigits: 11 },
  { name: "Greece", code: "GR", dialCode: "+30", flag: "🇬🇷", placeholder: "691 234 5678", minDigits: 10, maxDigits: 10 },
  { name: "Hong Kong", code: "HK", dialCode: "+852", flag: "🇭🇰", placeholder: "5123 4567", minDigits: 8, maxDigits: 8 },
  { name: "India", code: "IN", dialCode: "+91", flag: "🇮🇳", placeholder: "98765 43210", minDigits: 10, maxDigits: 10 },
  { name: "Indonesia", code: "ID", dialCode: "+62", flag: "🇮🇩", placeholder: "812 3456 7890", minDigits: 9, maxDigits: 12 },
  { name: "Ireland", code: "IE", dialCode: "+353", flag: "🇮🇪", placeholder: "85 123 4567", minDigits: 9, maxDigits: 9 },
  { name: "Italy", code: "IT", dialCode: "+39", flag: "🇮🇹", placeholder: "320 123 4567", minDigits: 10, maxDigits: 10 },
  { name: "Japan", code: "JP", dialCode: "+81", flag: "🇯🇵", placeholder: "90 1234 5678", minDigits: 10, maxDigits: 10 },
  { name: "Jordan", code: "JO", dialCode: "+962", flag: "🇯🇴", placeholder: "7 9012 3456", minDigits: 9, maxDigits: 9 },
  { name: "Kazakhstan", code: "KZ", dialCode: "+7", flag: "🇰🇿", placeholder: "701 123 4567", minDigits: 10, maxDigits: 10 },
  { name: "Kenya", code: "KE", dialCode: "+254", flag: "🇰🇪", placeholder: "712 345678", minDigits: 9, maxDigits: 9 },
  { name: "Kuwait", code: "KW", dialCode: "+965", flag: "🇰🇼", placeholder: "9123 4567", minDigits: 8, maxDigits: 8 },
  { name: "Lebanon", code: "LB", dialCode: "+961", flag: "🇱🇧", placeholder: "70 123 456", minDigits: 8, maxDigits: 8 },
  { name: "Malaysia", code: "MY", dialCode: "+60", flag: "🇲🇾", placeholder: "12 345 6789", minDigits: 9, maxDigits: 10 },
  { name: "Maldives", code: "MV", dialCode: "+960", flag: "🇲🇻", placeholder: "712 3456", minDigits: 7, maxDigits: 7 },
  { name: "Mexico", code: "MX", dialCode: "+52", flag: "🇲🇽", placeholder: "55 1234 5678", minDigits: 10, maxDigits: 10 },
  { name: "Monaco", code: "MC", dialCode: "+377", flag: "🇲🇨", placeholder: "6 12 34 56 78", minDigits: 8, maxDigits: 9 },
  { name: "Morocco", code: "MA", dialCode: "+212", flag: "🇲🇦", placeholder: "612 345678", minDigits: 9, maxDigits: 9 },
  { name: "Netherlands", code: "NL", dialCode: "+31", flag: "🇳🇱", placeholder: "6 12345678", minDigits: 9, maxDigits: 9 },
  { name: "New Zealand", code: "NZ", dialCode: "+64", flag: "🇳🇿", placeholder: "21 123 4567", minDigits: 8, maxDigits: 10 },
  { name: "Nigeria", code: "NG", dialCode: "+234", flag: "🇳🇬", placeholder: "802 123 4567", minDigits: 10, maxDigits: 10 },
  { name: "Norway", code: "NO", dialCode: "+47", flag: "🇳🇴", placeholder: "412 34 567", minDigits: 8, maxDigits: 8 },
  { name: "Oman", code: "OM", dialCode: "+968", flag: "🇴🇲", placeholder: "9123 4567", minDigits: 8, maxDigits: 8 },
  { name: "Pakistan", code: "PK", dialCode: "+92", flag: "🇵🇰", placeholder: "301 2345678", minDigits: 10, maxDigits: 10 },
  { name: "Philippines", code: "PH", dialCode: "+63", flag: "🇵🇭", placeholder: "917 123 4567", minDigits: 10, maxDigits: 10 },
  { name: "Poland", code: "PL", dialCode: "+48", flag: "🇵🇱", placeholder: "512 345 678", minDigits: 9, maxDigits: 9 },
  { name: "Portugal", code: "PT", dialCode: "+351", flag: "🇵🇹", placeholder: "912 345 678", minDigits: 9, maxDigits: 9 },
  { name: "Qatar", code: "QA", dialCode: "+974", flag: "🇶🇦", placeholder: "3312 3456", minDigits: 8, maxDigits: 8 },
  { name: "Romania", code: "RO", dialCode: "+40", flag: "🇷🇴", placeholder: "712 345 678", minDigits: 9, maxDigits: 9 },
  { name: "Russia", code: "RU", dialCode: "+7", flag: "🇷🇺", placeholder: "912 345 67 89", minDigits: 10, maxDigits: 10 },
  { name: "Saudi Arabia", code: "SA", dialCode: "+966", flag: "🇸🇦", placeholder: "50 123 4567", minDigits: 9, maxDigits: 9 },
  { name: "Singapore", code: "SG", dialCode: "+65", flag: "🇸🇬", placeholder: "8123 4567", minDigits: 8, maxDigits: 8 },
  { name: "South Africa", code: "ZA", dialCode: "+27", flag: "🇿🇦", placeholder: "71 123 4567", minDigits: 9, maxDigits: 9 },
  { name: "South Korea", code: "KR", dialCode: "+82", flag: "🇰🇷", placeholder: "10 1234 5678", minDigits: 9, maxDigits: 10 },
  { name: "Spain", code: "ES", dialCode: "+34", flag: "🇪🇸", placeholder: "612 34 56 78", minDigits: 9, maxDigits: 9 },
  { name: "Sri Lanka", code: "LK", dialCode: "+94", flag: "🇱🇰", placeholder: "71 234 5678", minDigits: 9, maxDigits: 9 },
  { name: "Sweden", code: "SE", dialCode: "+46", flag: "🇸🇪", placeholder: "70 123 45 67", minDigits: 9, maxDigits: 9 },
  { name: "Switzerland", code: "CH", dialCode: "+41", flag: "🇨🇭", placeholder: "78 123 45 67", minDigits: 9, maxDigits: 9 },
  { name: "Thailand", code: "TH", dialCode: "+66", flag: "🇹🇭", placeholder: "81 234 5678", minDigits: 9, maxDigits: 9 },
  { name: "Turkey", code: "TR", dialCode: "+90", flag: "🇹🇷", placeholder: "501 234 56 78", minDigits: 10, maxDigits: 10 },
  { name: "Ukraine", code: "UA", dialCode: "+380", flag: "🇺🇦", placeholder: "50 123 4567", minDigits: 9, maxDigits: 9 },
  { name: "United Arab Emirates", code: "AE", dialCode: "+971", flag: "🇦🇪", placeholder: "50 123 4567", minDigits: 9, maxDigits: 9 },
  { name: "United Kingdom", code: "GB", dialCode: "+44", flag: "🇬🇧", placeholder: "7123 456789", minDigits: 10, maxDigits: 10 },
  { name: "United States", code: "US", dialCode: "+1", flag: "🇺🇸", placeholder: "202 555 0123", minDigits: 10, maxDigits: 10 },
  { name: "Vietnam", code: "VN", dialCode: "+84", flag: "🇻🇳", placeholder: "91 234 56 78", minDigits: 9, maxDigits: 10 }
].sort((a, b) => a.name.localeCompare(b.name));

export const DEFAULT_COUNTRY = COUNTRIES.find(c => c.code === "AE") || COUNTRIES[0];

/**
 * Validates text-only inputs (names, cities, states)
 * Allows letters, spaces, hyphens, and apostrophes. Rejects any numbers or symbols.
 */
export function validateTextOnly(value: string): { isValid: boolean; error?: string } {
  if (!value || !value.trim()) {
    return { isValid: false, error: "This field is required." };
  }
  const textPattern = /^[a-zA-Z\s\-'\.]+$/;
  if (!textPattern.test(value.trim())) {
    return { isValid: false, error: "Only letters and spaces are allowed (no numbers or special characters)." };
  }
  return { isValid: true };
}

/**
 * Validates number-only inputs (phone digits, numerical pins)
 */
export function validateNumbersOnly(value: string): { isValid: boolean; error?: string } {
  if (!value || !value.trim()) {
    return { isValid: false, error: "This field is required." };
  }
  const digitsPattern = /^\d+$/;
  if (!digitsPattern.test(value.trim())) {
    return { isValid: false, error: "Only numbers (0-9) are allowed in this field." };
  }
  return { isValid: true };
}

/**
 * Validates country-specific phone number (mobile & landline)
 */
export function validatePhoneNumber(country: Country, digits: string): { isValid: boolean; error?: string } {
  const cleanDigits = digits.replace(/\D/g, "");
  if (!cleanDigits) {
    return { isValid: false, error: "Phone number is required." };
  }
  if (cleanDigits.length < country.minDigits) {
    return { 
      isValid: false, 
      error: `Number too short for ${country.name} (minimum ${country.minDigits} digits for mobile/landline).` 
    };
  }
  if (cleanDigits.length > country.maxDigits) {
    return { 
      isValid: false, 
      error: `Number exceeds maximum length for ${country.name} (maximum ${country.maxDigits} digits).` 
    };
  }
  return { isValid: true };
}
