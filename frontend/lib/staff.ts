/**
 * Approved Corporate Staff Roster for Lyka Realty.
 * 
 * Strict Security Rules:
 * - Mock emails (agent@, agent2@, manager@, admin@) are STRICTLY RESTRICTED AND DISALLOWED.
 * - Exactly 12 Authorized Sales Persons (Official corporate emails)
 * - Exactly 1 Authorized Sales Manager (Official corporate email)
 * - Exactly 1 Authorized System Administrator (Official corporate email)
 */

export interface StaffMember {
  email: string;
  name: string;
  title: string;
  department: string;
  specialty: string;
  phone: string;
  role: "agent" | "manager" | "admin";
}

// Disallowed mock/alias emails that must be actively rejected
export const DISALLOWED_MOCK_EMAILS: string[] = [
  "agent@lykarealty.ae",
  "agent2@lykarealty.ae",
  "manager@lykarealty.ae",
  "admin@lykarealty.ae",
  "customer@lykarealty.ae"
];

// Exactly 12 Authorized Real Sales Persons (ONLY official corporate emails)
export const APPROVED_SALES_PERSONS: StaffMember[] = [
  {
    email: "rajesh.sharma@lykarealty.ae",
    name: "Rajesh Sharma",
    title: "Senior Sales Consultant",
    department: "Prime Residential Sales",
    specialty: "Downtown Dubai & Business Bay",
    phone: "+971 50 234 5671",
    role: "agent"
  },
  {
    email: "sarah.jenkins@lykarealty.ae",
    name: "Sarah Jenkins",
    title: "Luxury Property Specialist",
    department: "Ultra-Luxury Waterfront",
    specialty: "Palm Jumeirah & Waterfront Residences",
    phone: "+971 50 345 6782",
    role: "agent"
  },
  {
    email: "tariq.mansoor@lykarealty.ae",
    name: "Tariq Mansoor",
    title: "Prime Residential Consultant",
    department: "Marina & Coastal Properties",
    specialty: "Dubai Marina & JBR Beachfront",
    phone: "+971 50 456 7893",
    role: "agent"
  },
  {
    email: "ananya.subramanian@lykarealty.ae",
    name: "Ananya Subramanian",
    title: "Off-Plan & Investment Advisor",
    department: "Developer Projects & Off-Plan",
    specialty: "Dubai Hills Estate & Emaar South",
    phone: "+971 50 567 8904",
    role: "agent"
  },
  {
    email: "omar.farooq@lykarealty.ae",
    name: "Omar Farooq",
    title: "Commercial & Villa Specialist",
    department: "Luxury Villas & Estates",
    specialty: "Emirates Hills & Jumeirah Islands",
    phone: "+971 50 678 9015",
    role: "agent"
  },
  {
    email: "priya.nair@lykarealty.ae",
    name: "Priya Nair",
    title: "High-Net-Worth Portfolio Advisor",
    department: "HNW Investor Advisory",
    specialty: "Dubai Creek Harbour & MBR City",
    phone: "+971 50 789 0126",
    role: "agent"
  },
  {
    email: "elena.rostova@lykarealty.ae",
    name: "Elena Rostova",
    title: "European Investor Relations Desk",
    department: "International Client Desk",
    specialty: "Ultra-Luxury Penthouses & Jumeirah Bay",
    phone: "+971 50 890 1237",
    role: "agent"
  },
  {
    email: "hassan.alzaabi@lykarealty.ae",
    name: "Hassan Al-Zaabi",
    title: "VIP Client Relations Director",
    department: "Private Client Office",
    specialty: "Private Mansions & Palm Jumeirah Signature Villas",
    phone: "+971 50 901 2348",
    role: "agent"
  },
  {
    email: "david.miller@lykarealty.ae",
    name: "David Miller",
    title: "Penthouse & Prime Architecture Consultant",
    department: "DIFC & Financial District",
    specialty: "DIFC & Downtown High-Rise Residences",
    phone: "+971 50 012 3459",
    role: "agent"
  },
  {
    email: "zainab.rashid@lykarealty.ae",
    name: "Zainab Rashid",
    title: "Waterfront & Island Residences Expert",
    department: "Island Developments",
    specialty: "Bluewaters Island & Pearl Jumeira",
    phone: "+971 50 123 4560",
    role: "agent"
  },
  {
    email: "marcus.vance@lykarealty.ae",
    name: "Marcus Vance",
    title: "Senior Investment Strategist",
    department: "Gated Family Communities",
    specialty: "Arabian Ranches & Tilal Al Ghaf Communities",
    phone: "+971 50 234 5670",
    role: "agent"
  },
  {
    email: "chloe.dubois@lykarealty.ae",
    name: "Chloe Dubois",
    title: "French & Mediterranean Investor Relations",
    department: "European Advisory",
    specialty: "City Walk, La Mer & Nikki Beach Residences",
    phone: "+971 50 345 6781",
    role: "agent"
  }
];

// Exactly 1 Authorized Real Sales Manager
export const APPROVED_SALES_MANAGER: StaffMember = {
  email: "fatima.alzaabi@lykarealty.ae",
  name: "Fatima Al-Zaabi",
  title: "Head of Sales & Regional Sales Director",
  department: "Executive Sales Management",
  specialty: "All UAE Sales Operations & Commercial Leadership",
  phone: "+971 50 112 3456",
  role: "manager"
};

// Exactly 1 Authorized Real System Administrator
export const APPROVED_ADMIN: StaffMember = {
  email: "alexander.vance@lykarealty.ae",
  name: "Alexander Vance",
  title: "Managing Director & Principal System Administrator",
  department: "Executive Management & IT Governance",
  specialty: "Enterprise Systems, Property Inventory & Audit Logs",
  phone: "+971 50 998 7766",
  role: "admin"
};

/**
 * Returns whether an email is strictly authorized for the requested role.
 * Mock/alias emails are explicitly disallowed.
 */
export function isAuthorizedStaffEmail(email: string, role: "agent" | "manager" | "admin"): boolean {
  if (!email) return false;
  const clean = email.trim().toLowerCase();

  // Reject mock emails
  if (DISALLOWED_MOCK_EMAILS.includes(clean)) {
    return false;
  }

  if (role === "agent") {
    return APPROVED_SALES_PERSONS.some((sp) => sp.email.toLowerCase() === clean);
  }

  if (role === "manager") {
    return APPROVED_SALES_MANAGER.email.toLowerCase() === clean;
  }

  if (role === "admin") {
    return APPROVED_ADMIN.email.toLowerCase() === clean;
  }

  return false;
}

/**
 * Get staff profile matching official email
 */
export function getStaffProfileByEmail(email: string): StaffMember | null {
  if (!email) return null;
  const clean = email.trim().toLowerCase();

  if (DISALLOWED_MOCK_EMAILS.includes(clean)) {
    return null;
  }

  if (APPROVED_ADMIN.email.toLowerCase() === clean) {
    return APPROVED_ADMIN;
  }

  if (APPROVED_SALES_MANAGER.email.toLowerCase() === clean) {
    return APPROVED_SALES_MANAGER;
  }

  const foundSales = APPROVED_SALES_PERSONS.find((sp) => sp.email.toLowerCase() === clean);
  return foundSales || null;
}

/**
 * Returns all approved email strings for the given role
 */
export function getAllowedStaffEmails(role: "agent" | "manager" | "admin"): string[] {
  if (role === "agent") {
    return APPROVED_SALES_PERSONS.map((sp) => sp.email);
  }
  if (role === "manager") {
    return [APPROVED_SALES_MANAGER.email];
  }
  if (role === "admin") {
    return [APPROVED_ADMIN.email];
  }
  return [];
}

/**
 * Allotment of the 12 Real Estate Sales Persons to specific Dubai locations & prime communities
 */
export const LOCATION_SPECIALIST_MAP: Record<string, string> = {
  // Rajesh Sharma
  "downtown": "rajesh.sharma@lykarealty.ae",
  "downtown dubai": "rajesh.sharma@lykarealty.ae",
  "business bay": "rajesh.sharma@lykarealty.ae",
  
  // Sarah Jenkins
  "palm jumeirah": "sarah.jenkins@lykarealty.ae",
  "waterfront": "sarah.jenkins@lykarealty.ae",

  // Tariq Mansoor
  "dubai marina": "tariq.mansoor@lykarealty.ae",
  "jbr": "tariq.mansoor@lykarealty.ae",
  "jumeirah beach residence": "tariq.mansoor@lykarealty.ae",

  // Ananya Subramanian
  "dubai hills": "ananya.subramanian@lykarealty.ae",
  "dubai hills estate": "ananya.subramanian@lykarealty.ae",
  "emaar south": "ananya.subramanian@lykarealty.ae",

  // Omar Farooq
  "emirates hills": "omar.farooq@lykarealty.ae",
  "jumeirah islands": "omar.farooq@lykarealty.ae",

  // Priya Nair
  "dubai creek": "priya.nair@lykarealty.ae",
  "dubai creek harbour": "priya.nair@lykarealty.ae",
  "mbr city": "priya.nair@lykarealty.ae",
  "mohammed bin rashid city": "priya.nair@lykarealty.ae",

  // Elena Rostova
  "jumeirah bay": "elena.rostova@lykarealty.ae",
  "penthouse": "elena.rostova@lykarealty.ae",

  // Hassan Al-Zaabi
  "signature villas": "hassan.alzaabi@lykarealty.ae",
  "palm villas": "hassan.alzaabi@lykarealty.ae",
  "private mansions": "hassan.alzaabi@lykarealty.ae",

  // David Miller
  "difc": "david.miller@lykarealty.ae",
  "financial district": "david.miller@lykarealty.ae",

  // Zainab Rashid
  "bluewaters": "zainab.rashid@lykarealty.ae",
  "bluewaters island": "zainab.rashid@lykarealty.ae",
  "pearl jumeira": "zainab.rashid@lykarealty.ae",

  // Marcus Vance
  "arabian ranches": "marcus.vance@lykarealty.ae",
  "tilal al ghaf": "marcus.vance@lykarealty.ae",

  // Chloe Dubois
  "city walk": "chloe.dubois@lykarealty.ae",
  "la mer": "chloe.dubois@lykarealty.ae",
  "nikki beach": "chloe.dubois@lykarealty.ae",
};

/**
 * Automatically assign lead to the designated location specialist salesperson
 */
export function getAllottedSalespersonForLocation(location?: string | null): StaffMember {
  if (location) {
    const locLower = location.toLowerCase().trim();
    for (const [key, email] of Object.entries(LOCATION_SPECIALIST_MAP)) {
      if (locLower.includes(key)) {
        const matched = APPROVED_SALES_PERSONS.find((sp) => sp.email.toLowerCase() === email.toLowerCase());
        if (matched) return matched;
      }
    }
  }
  return APPROVED_SALES_PERSONS[Math.floor(Math.random() * APPROVED_SALES_PERSONS.length)];
}

