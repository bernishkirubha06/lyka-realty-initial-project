import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as fbSignOut, 
  onAuthStateChanged,
  User as FirebaseUser,
  Auth
} from "firebase/auth";
import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  Timestamp,
  Firestore 
} from "firebase/firestore";

// List of approved salesperson emails permitted to access the Sales Person Dashboard (12 Sales Persons, 1 Manager, 1 Admin)
export const APPROVED_SALESPERSON_EMAILS = [
  "rajesh.sharma@lykarealty.ae",
  "sarah.jenkins@lykarealty.ae",
  "tariq.mansoor@lykarealty.ae",
  "ananya.subramanian@lykarealty.ae",
  "omar.farooq@lykarealty.ae",
  "priya.nair@lykarealty.ae",
  "elena.rostova@lykarealty.ae",
  "hassan.alzaabi@lykarealty.ae",
  "david.miller@lykarealty.ae",
  "zainab.rashid@lykarealty.ae",
  "marcus.vance@lykarealty.ae",
  "chloe.dubois@lykarealty.ae",
  "fatima.alzaabi@lykarealty.ae",
  "alexander.vance@lykarealty.ae"
];

export interface SalespersonProfile {
  uid: string;
  email: string;
  full_name: string;
  role: "salesperson" | "manager" | "admin";
  phone?: string;
  is_approved: boolean;
  assigned_count?: number;
}

export interface CustomerActivityEvent {
  id: string;
  customer_id?: string | number | null;
  customer_name: string;
  customer_email?: string | null;
  customer_phone?: string | null;
  activity_type: "page_view" | "property_view" | "property_save" | "property_unsave" | "search" | "enquiry_submitted" | "site_visit_requested";
  property_id?: number | null;
  property_title?: string | null;
  property_price?: number | null;
  property_locality?: string | null;
  property_image?: string | null;
  property_bhk?: number | null;
  time_spent_seconds?: number;
  search_query?: string | null;
  details?: string | null;
  timestamp: string;
  is_demo?: boolean;
}

export interface SalesLead {
  id: string;
  customer_name: string;
  email?: string | null;
  phone?: string | null;
  city: string;
  locality?: string | null;
  property_type: string;
  bhk?: number | null;
  budget_min?: number | null;
  budget_max?: number | null;
  currency: string;
  purchase_timeline?: string | null;
  preferred_features: string[];
  pipeline_status: "New" | "Contacted" | "Interested" | "Viewing Scheduled" | "Negotiation" | "Converted" | "Lost";
  purpose?: string | null;
  lead_type?: string | null;
  assigned_to_email?: string | null;
  assigned_agent_name?: string | null;
  last_interaction: string;
  created_at: string;
  notes?: string;
  is_demo?: boolean;
}

export interface SalesFollowUp {
  id: string;
  lead_id: string;
  customer_name: string;
  agent_email: string;
  agent_name: string;
  note: string;
  type: "call" | "whatsapp" | "email" | "meeting" | "general";
  due_date: string;
  status: "pending" | "completed";
  created_at: string;
  is_demo?: boolean;
}

export interface SalesSiteVisit {
  id: string;
  lead_id?: string | null;
  customer_name: string;
  contact_phone: string;
  contact_email?: string | null;
  property_id: number;
  property_title?: string;
  property_locality?: string;
  property_price?: number;
  property_image?: string;
  preferred_date: string;
  preferred_time: string;
  notes?: string | null;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  assigned_to_email?: string | null;
  created_at: string;
  is_demo?: boolean;
}

// Firebase configuration from environment
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyDemoPropAILykaRealtyKey1234567890",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "lyka-realty-propai.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "lyka-realty-propai",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "lyka-realty-propai.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "1029384756",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:1029384756:web:abcdef123456"
};

// Check if actual production Firebase keys are configured
export const isLiveFirebaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY && 
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY !== "AIzaSyDemoPropAILykaRealtyKey1234567890"
);

// Initialize Firebase App
let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;

if (typeof window !== "undefined") {
  try {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
  } catch (err) {
    console.warn("Firebase client initialization note (running in dual-mode):", err);
  }
}

export { app, auth, db };

// Local Reactive Store for zero-config out-of-the-box local testing & fallback
const LISTENERS: Record<string, Set<(data: any) => void>> = {};

function notifyListeners(collectionName: string) {
  if (LISTENERS[collectionName]) {
    const data = getLocalStoreCollection(collectionName);
    LISTENERS[collectionName].forEach(cb => cb(data));
  }
}

function getStorageKey(col: string) {
  return `lyka_fb_${col}`;
}

export function getLocalStoreCollection<T>(collectionName: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(getStorageKey(collectionName));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function setLocalStoreCollection<T>(collectionName: string, data: T[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(getStorageKey(collectionName), JSON.stringify(data));
    notifyListeners(collectionName);
  } catch {}
}

// -------------------------------------------------------------
// UNIFIED FIRESTORE SERVICE (Dual-Mode: Real Firestore + Local Reactive Bridge)
// -------------------------------------------------------------
export const firebaseService = {
  /**
   * Check if an email is on the approved salesperson roster
   */
  isApprovedSalesperson(email?: string | null): boolean {
    if (!email) return false;
    const clean = email.trim().toLowerCase();
    return APPROVED_SALESPERSON_EMAILS.some(e => e.toLowerCase() === clean);
  },

  /**
   * Record customer activity (page view, property view, time spent, saved property)
   * Automatically emitted from the Customer Tab.
   */
  async recordActivity(activity: Omit<CustomerActivityEvent, "id" | "timestamp">): Promise<void> {
    const timestamp = new Date().toISOString();
    const eventId = `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const fullActivity: CustomerActivityEvent = {
      ...activity,
      id: eventId,
      timestamp
    };

    // 1. Try real Firestore if available
    if (db && isLiveFirebaseConfigured) {
      try {
        await addDoc(collection(db, "customer_activities"), fullActivity);
      } catch (e) {
        console.warn("Failed to write to Firestore customer_activities:", e);
      }
    }

    // 2. Always persist in reactive store for immediate local real-time display
    const items = getLocalStoreCollection<CustomerActivityEvent>("customer_activities");
    // If updating time on same property view within 2 minutes, update existing
    if (activity.activity_type === "property_view" && activity.property_id && activity.time_spent_seconds) {
      const existingIdx = items.findIndex(
        i => i.activity_type === "property_view" && 
             i.property_id === activity.property_id && 
             i.customer_email === activity.customer_email &&
             (Date.now() - new Date(i.timestamp).getTime()) < 120000
      );
      if (existingIdx !== -1) {
        items[existingIdx].time_spent_seconds = (items[existingIdx].time_spent_seconds || 0) + (activity.time_spent_seconds || 0);
        items[existingIdx].timestamp = timestamp;
        setLocalStoreCollection("customer_activities", items);
        return;
      }
    }

    items.unshift(fullActivity);
    // Keep last 300 activities
    if (items.length > 300) items.pop();
    setLocalStoreCollection("customer_activities", items);
  },

  /**
   * Listen to real-time customer activities
   */
  subscribeCustomerActivities(callback: (activities: CustomerActivityEvent[]) => void): () => void {
    if (db && isLiveFirebaseConfigured) {
      try {
        const q = query(collection(db, "customer_activities"), orderBy("timestamp", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
          const list: CustomerActivityEvent[] = [];
          snapshot.forEach(doc => {
            list.push({ ...doc.data(), id: doc.id } as CustomerActivityEvent);
          });
          callback(list);
        }, () => {
          callback(getLocalStoreCollection<CustomerActivityEvent>("customer_activities"));
        });
        return unsubscribe;
      } catch {}
    }

    // Reactive store subscription
    if (!LISTENERS["customer_activities"]) LISTENERS["customer_activities"] = new Set();
    LISTENERS["customer_activities"].add(callback);
    callback(getLocalStoreCollection<CustomerActivityEvent>("customer_activities"));

    return () => {
      LISTENERS["customer_activities"]?.delete(callback);
    };
  },

  /**
   * Create or update lead (from Customer Tab requirement form or manual salesperson entry)
   */
  async saveLead(leadData: Partial<SalesLead>): Promise<SalesLead> {
    const timestamp = new Date().toISOString();
    const leadId = leadData.id || `lead_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    
    const lead: SalesLead = {
      id: leadId,
      customer_name: leadData.customer_name || "Prospective Client",
      email: leadData.email || null,
      phone: leadData.phone || null,
      city: leadData.city || "Dubai",
      locality: leadData.locality || "Downtown Dubai",
      property_type: leadData.property_type || "Apartment",
      bhk: leadData.bhk ?? 2,
      budget_min: leadData.budget_min ?? 1000000,
      budget_max: leadData.budget_max ?? 2500000,
      currency: leadData.currency || "AED",
      purchase_timeline: leadData.purchase_timeline || "Within 3 months",
      preferred_features: leadData.preferred_features || [],
      pipeline_status: (leadData.pipeline_status as any) || "New",
      purpose: leadData.purpose || "Investment",
      lead_type: leadData.lead_type || "Buyer",
      assigned_to_email: leadData.assigned_to_email || "rajesh.sharma@lykarealty.ae",
      assigned_agent_name: leadData.assigned_agent_name || "Rajesh Sharma",
      last_interaction: timestamp,
      created_at: leadData.created_at || timestamp,
      notes: leadData.notes || "",
      is_demo: leadData.is_demo ?? false
    };

    // Firestore
    if (db && isLiveFirebaseConfigured) {
      try {
        await setDoc(doc(db, "leads", leadId), lead, { merge: true });
      } catch (e) {
        console.warn("Failed to write lead to Firestore:", e);
      }
    }

    // Local reactive store
    const leads = getLocalStoreCollection<SalesLead>("leads");
    const existingIndex = leads.findIndex(l => l.id === leadId);
    if (existingIndex >= 0) {
      leads[existingIndex] = { ...leads[existingIndex], ...lead };
    } else {
      leads.unshift(lead);
    }
    setLocalStoreCollection("leads", leads);

    return lead;
  },

  /**
   * Update lead pipeline status (New, Contacted, Interested, Viewing Scheduled, Negotiation, Converted, Lost)
   */
  async updateLeadStatus(leadId: string, status: SalesLead["pipeline_status"]): Promise<void> {
    const timestamp = new Date().toISOString();
    if (db && isLiveFirebaseConfigured) {
      try {
        await updateDoc(doc(db, "leads", leadId), {
          pipeline_status: status,
          last_interaction: timestamp
        });
      } catch {}
    }

    const leads = getLocalStoreCollection<SalesLead>("leads");
    const index = leads.findIndex(l => l.id === leadId);
    if (index >= 0) {
      leads[index].pipeline_status = status;
      leads[index].last_interaction = timestamp;
      setLocalStoreCollection("leads", leads);
    }
  },

  /**
   * Subscribe to leads assigned to the current salesperson (or all if manager/admin)
   */
  subscribeAssignedLeads(
    agentEmail: string, 
    callback: (leads: SalesLead[]) => void, 
    isManager: boolean = false
  ): () => void {
    const filterLeads = (all: SalesLead[]) => {
      if (isManager) return all;
      const cleanAgent = (agentEmail || "").trim().toLowerCase();
      if (!cleanAgent) return [];
      return all.filter(l => 
        Boolean(l.assigned_to_email && l.assigned_to_email.toLowerCase() === cleanAgent)
      );
    };

    if (db && isLiveFirebaseConfigured) {
      try {
        const q = isManager
          ? query(collection(db, "leads"), orderBy("created_at", "desc"))
          : query(collection(db, "leads"), where("assigned_to_email", "==", agentEmail));

        const unsubscribe = onSnapshot(q, (snapshot) => {
          const list: SalesLead[] = [];
          snapshot.forEach(d => list.push({ ...d.data(), id: d.id } as SalesLead));
          callback(filterLeads(list));
        }, () => {
          callback(filterLeads(getLocalStoreCollection<SalesLead>("leads")));
        });
        return unsubscribe;
      } catch {}
    }

    // Reactive store
    if (!LISTENERS["leads"]) LISTENERS["leads"] = new Set();
    const listener = (all: SalesLead[]) => callback(filterLeads(all));
    LISTENERS["leads"].add(listener);
    callback(filterLeads(getLocalStoreCollection<SalesLead>("leads")));

    return () => {
      LISTENERS["leads"]?.delete(listener);
    };
  },

  /**
   * Add a follow-up note for a customer
   */
  async addFollowUp(followUpData: Omit<SalesFollowUp, "id" | "created_at">): Promise<SalesFollowUp> {
    const id = `fup_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const full: SalesFollowUp = {
      ...followUpData,
      id,
      created_at: new Date().toISOString()
    };

    if (db && isLiveFirebaseConfigured) {
      try {
        await setDoc(doc(db, "follow_ups", id), full);
      } catch {}
    }

    const notes = getLocalStoreCollection<SalesFollowUp>("follow_ups");
    notes.unshift(full);
    setLocalStoreCollection("follow_ups", notes);

    // Also update lead's last_interaction
    await this.updateLeadLastInteraction(followUpData.lead_id);

    return full;
  },

  /**
   * Update follow-up status (pending -> completed)
   */
  async updateFollowUpStatus(followUpId: string, status: "pending" | "completed"): Promise<void> {
    if (db && isLiveFirebaseConfigured) {
      try {
        await updateDoc(doc(db, "follow_ups", followUpId), { status });
      } catch {}
    }

    const notes = getLocalStoreCollection<SalesFollowUp>("follow_ups");
    const idx = notes.findIndex(n => n.id === followUpId);
    if (idx >= 0) {
      notes[idx].status = status;
      setLocalStoreCollection("follow_ups", notes);
    }
  },

  /**
   * Subscribe to follow-ups, strictly isolated by salesperson
   */
  subscribeFollowUps(
    leadId: string | null, 
    callback: (notes: SalesFollowUp[]) => void,
    agentEmail?: string | null
  ): () => void {
    const filterNotes = (all: SalesFollowUp[]) => {
      let filtered = all;
      if (leadId) {
        filtered = filtered.filter(n => n.lead_id === leadId);
      }
      if (agentEmail) {
        const clean = agentEmail.trim().toLowerCase();
        filtered = filtered.filter(n => Boolean(n.agent_email && n.agent_email.toLowerCase() === clean));
      }
      return filtered;
    };

    if (db && isLiveFirebaseConfigured) {
      try {
        const q = leadId 
          ? query(collection(db, "follow_ups"), where("lead_id", "==", leadId))
          : query(collection(db, "follow_ups"), orderBy("due_date", "asc"));

        const unsubscribe = onSnapshot(q, (snapshot) => {
          const list: SalesFollowUp[] = [];
          snapshot.forEach(d => list.push({ ...d.data(), id: d.id } as SalesFollowUp));
          callback(filterNotes(list));
        }, () => {
          callback(filterNotes(getLocalStoreCollection<SalesFollowUp>("follow_ups")));
        });
        return unsubscribe;
      } catch {}
    }

    if (!LISTENERS["follow_ups"]) LISTENERS["follow_ups"] = new Set();
    const listener = (all: SalesFollowUp[]) => callback(filterNotes(all));
    LISTENERS["follow_ups"].add(listener);
    callback(filterNotes(getLocalStoreCollection<SalesFollowUp>("follow_ups")));

    return () => {
      LISTENERS["follow_ups"]?.delete(listener);
    };
  },

  /**
   * Save or update site visit
   */
  async saveSiteVisit(visitData: Partial<SalesSiteVisit>): Promise<SalesSiteVisit> {
    const id = visitData.id || `vis_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const full: SalesSiteVisit = {
      id,
      lead_id: visitData.lead_id || null,
      customer_name: visitData.customer_name || "Client",
      contact_phone: visitData.contact_phone || "",
      contact_email: visitData.contact_email || null,
      property_id: visitData.property_id || 1,
      property_title: visitData.property_title || "Luxury Residence",
      property_locality: visitData.property_locality || "Dubai",
      property_price: visitData.property_price || 0,
      property_image: visitData.property_image || "",
      preferred_date: visitData.preferred_date || new Date().toISOString().split("T")[0],
      preferred_time: visitData.preferred_time || "11:00 AM",
      notes: visitData.notes || "",
      status: visitData.status || "pending",
      assigned_to_email: visitData.assigned_to_email || "rajesh.sharma@lykarealty.ae",
      created_at: visitData.created_at || new Date().toISOString(),
      is_demo: visitData.is_demo ?? false
    };

    if (db && isLiveFirebaseConfigured) {
      try {
        await setDoc(doc(db, "site_visits", id), full, { merge: true });
      } catch {}
    }

    const visits = getLocalStoreCollection<SalesSiteVisit>("site_visits");
    const idx = visits.findIndex(v => v.id === id);
    if (idx >= 0) {
      visits[idx] = { ...visits[idx], ...full };
    } else {
      visits.unshift(full);
    }
    setLocalStoreCollection("site_visits", visits);

    return full;
  },

  /**
   * Update site visit status (pending, confirmed, completed, cancelled)
   */
  async updateSiteVisitStatus(visitId: string, status: SalesSiteVisit["status"]): Promise<void> {
    if (db && isLiveFirebaseConfigured) {
      try {
        await updateDoc(doc(db, "site_visits", visitId), { status });
      } catch {}
    }

    const visits = getLocalStoreCollection<SalesSiteVisit>("site_visits");
    const idx = visits.findIndex(v => v.id === visitId);
    if (idx >= 0) {
      visits[idx].status = status;
      setLocalStoreCollection("site_visits", visits);
    }
  },

  /**
   * Subscribe to site visits, strictly isolated by salesperson
   */
  subscribeSiteVisits(
    agentEmailOrCallback: string | null | undefined | ((visits: SalesSiteVisit[]) => void),
    callbackOrAgentEmail?: ((visits: SalesSiteVisit[]) => void) | string | null
  ): () => void {
    let agentEmail: string | null = null;
    let callback: (visits: SalesSiteVisit[]) => void;

    if (typeof agentEmailOrCallback === "function") {
      callback = agentEmailOrCallback;
      agentEmail = typeof callbackOrAgentEmail === "string" ? callbackOrAgentEmail : null;
    } else {
      agentEmail = agentEmailOrCallback || null;
      callback = callbackOrAgentEmail as (visits: SalesSiteVisit[]) => void;
    }

    const filterVisits = (all: SalesSiteVisit[]) => {
      if (!agentEmail) return all;
      const clean = agentEmail.trim().toLowerCase();
      return all.filter(v => Boolean(v.assigned_to_email && v.assigned_to_email.toLowerCase() === clean));
    };

    if (db && isLiveFirebaseConfigured) {
      try {
        const q = query(collection(db, "site_visits"), orderBy("created_at", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
          const list: SalesSiteVisit[] = [];
          snapshot.forEach(d => list.push({ ...d.data(), id: d.id } as SalesSiteVisit));
          callback(filterVisits(list));
        }, () => {
          callback(filterVisits(getLocalStoreCollection<SalesSiteVisit>("site_visits")));
        });
        return unsubscribe;
      } catch {}
    }

    if (!LISTENERS["site_visits"]) LISTENERS["site_visits"] = new Set();
    const listener = (all: SalesSiteVisit[]) => callback(filterVisits(all));
    LISTENERS["site_visits"].add(listener);
    callback(filterVisits(getLocalStoreCollection<SalesSiteVisit>("site_visits")));

    return () => {
      LISTENERS["site_visits"]?.delete(listener);
    };
  },

  async updateLeadLastInteraction(leadId: string): Promise<void> {
    const timestamp = new Date().toISOString();
    const leads = getLocalStoreCollection<SalesLead>("leads");
    const idx = leads.findIndex(l => l.id === leadId);
    if (idx >= 0) {
      leads[idx].last_interaction = timestamp;
      setLocalStoreCollection("leads", leads);
    }
  },

  /**
   * Seed realistic initial demo data if the store is empty (clearly labeled as demo data per prompt)
   */
  seedInitialDataIfEmpty(): void {
    if (typeof window === "undefined") return;
    const existing = getLocalStoreCollection<SalesLead>("leads");
    if (existing && existing.length > 0) return;

    const demoLeads: SalesLead[] = [
      {
        id: "demo_lead_1",
        customer_name: "Hamdan Al Maktoum",
        email: "hamdan.m@example.ae",
        phone: "+971 50 892 1102",
        city: "Dubai",
        locality: "Downtown Dubai",
        property_type: "Apartment",
        bhk: 2,
        budget_min: 2200000,
        budget_max: 3000000,
        currency: "AED",
        purchase_timeline: "Within 1 month",
        preferred_features: ["Burj Khalifa View", "Balcony", "Covered Parking", "Near Metro Station"],
        pipeline_status: "Viewing Scheduled",
        purpose: "Investment",
        lead_type: "Buyer",
        assigned_to_email: "rajesh.sharma@lykarealty.ae",
        assigned_agent_name: "Rajesh Sharma",
        last_interaction: new Date(Date.now() - 3600000 * 2).toISOString(),
        created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
        notes: "Client is an active investor looking for strong short-term rental yields in Downtown.",
        is_demo: true
      },
      {
        id: "demo_lead_2",
        customer_name: "Ananya Deshmukh",
        email: "ananya.d@investor.in",
        phone: "+91 98201 44510",
        city: "Dubai",
        locality: "Palm Jumeirah",
        property_type: "Penthouse",
        bhk: 3,
        budget_min: 4500000,
        budget_max: 6000000,
        currency: "AED",
        purchase_timeline: "Within 3 months",
        preferred_features: ["Sea/Water View", "Private Pool", "High Floor", "Luxury Amenities"],
        pipeline_status: "Interested",
        purpose: "Second Home",
        lead_type: "Buyer",
        assigned_to_email: "rajesh.sharma@lykarealty.ae",
        assigned_agent_name: "Rajesh Sharma",
        last_interaction: new Date(Date.now() - 3600000 * 5).toISOString(),
        created_at: new Date(Date.now() - 86400000 * 4).toISOString(),
        notes: "NRI buyer seeking sea-facing luxury residence for annual family vacations and capital preservation.",
        is_demo: true
      },
      {
        id: "demo_lead_3",
        customer_name: "Marcus Vance",
        email: "m.vance@ukcapital.co.uk",
        phone: "+44 7700 900321",
        city: "Dubai",
        locality: "Dubai Marina",
        property_type: "Apartment",
        bhk: 2,
        budget_min: 1500000,
        budget_max: 2200000,
        currency: "AED",
        purchase_timeline: "Immediate",
        preferred_features: ["Marina View", "Swimming Pool", "Shared Gym", "Modern Kitchen"],
        pipeline_status: "New",
        purpose: "Personal use",
        lead_type: "Buyer",
        assigned_to_email: "tariq.mansoor@lykarealty.ae",
        assigned_agent_name: "Tariq Mansoor",
        last_interaction: new Date(Date.now() - 3600000 * 1).toISOString(),
        created_at: new Date(Date.now() - 3600000 * 3).toISOString(),
        notes: "Relocating to Dubai next month. Needs turnkey furnished apartment near marina promenade.",
        is_demo: true
      },
      {
        id: "demo_lead_4",
        customer_name: "Tariq Bin Sulayem",
        email: "tariq.s@emiratesmail.ae",
        phone: "+971 55 412 8890",
        city: "Dubai",
        locality: "Jumeirah Village Circle (JVC)",
        property_type: "Villa",
        bhk: 4,
        budget_min: 3000000,
        budget_max: 4200000,
        currency: "AED",
        purchase_timeline: "Within 6 months",
        preferred_features: ["Private Garden", "Maid's Room", "Gated Community", "Covered Parking"],
        pipeline_status: "Negotiation",
        purpose: "Family Home",
        lead_type: "Buyer",
        assigned_to_email: "ananya.subramanian@lykarealty.ae",
        assigned_agent_name: "Ananya Subramanian",
        last_interaction: new Date(Date.now() - 3600000 * 8).toISOString(),
        created_at: new Date(Date.now() - 86400000 * 7).toISOString(),
        notes: "Discussing payment plans with developer on 4 BHK signature villa.",
        is_demo: true
      },
      {
        id: "demo_lead_5",
        customer_name: "Elena Rostova",
        email: "elena.rostova@globemail.com",
        phone: "+971 52 984 3321",
        city: "Dubai",
        locality: "Business Bay",
        property_type: "Apartment",
        bhk: 1,
        budget_min: 950000,
        budget_max: 1400000,
        currency: "AED",
        purchase_timeline: "Within 2 months",
        preferred_features: ["Canal View", "High Floor", "Gymnasium / Fitness Center"],
        pipeline_status: "Contacted",
        purpose: "Investment",
        lead_type: "Buyer",
        assigned_to_email: "sarah.jenkins@lykarealty.ae",
        assigned_agent_name: "Sarah Jenkins",
        last_interaction: new Date(Date.now() - 86400000 * 1).toISOString(),
        created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
        notes: "Spoke via phone. Interested in high ROI 1-bedroom units near Dubai Canal.",
        is_demo: true
      }
    ];

    setLocalStoreCollection("leads", demoLeads);

    const demoActivities: CustomerActivityEvent[] = [
      {
        id: "demo_act_1",
        customer_name: "Hamdan Al Maktoum",
        customer_email: "hamdan.m@example.ae",
        activity_type: "property_view",
        property_id: 1905,
        property_title: "Premium 1 BHK Luxury Residence at Jumeirah Lake Towers",
        property_price: 760887,
        property_locality: "Jumeirah Lake Towers",
        property_image: "https://images.unsplash.com/photo-1546412414-e1885259563a?auto=format&fit=crop&w=1200&q=80",
        property_bhk: 1,
        time_spent_seconds: 245,
        timestamp: new Date(Date.now() - 3600000 * 1.5).toISOString(),
        is_demo: true
      },
      {
        id: "demo_act_2",
        customer_name: "Hamdan Al Maktoum",
        customer_email: "hamdan.m@example.ae",
        activity_type: "property_save",
        property_id: 1905,
        property_title: "Premium 1 BHK Luxury Residence at Jumeirah Lake Towers",
        property_price: 760887,
        property_locality: "Jumeirah Lake Towers",
        timestamp: new Date(Date.now() - 3600000 * 1.4).toISOString(),
        is_demo: true
      },
      {
        id: "demo_act_3",
        customer_name: "Ananya Deshmukh",
        customer_email: "ananya.d@investor.in",
        activity_type: "property_view",
        property_id: 1904,
        property_title: "Luxury 1 Bedroom Signature Villa at Jumeirah Village Circle",
        property_price: 675000,
        property_locality: "Jumeirah Village Circle",
        property_image: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80",
        property_bhk: 1,
        time_spent_seconds: 410,
        timestamp: new Date(Date.now() - 3600000 * 4).toISOString(),
        is_demo: true
      },
      {
        id: "demo_act_4",
        customer_name: "Marcus Vance",
        customer_email: "m.vance@ukcapital.co.uk",
        activity_type: "search",
        search_query: "Dubai Marina 2 BHK under 2.2M AED",
        timestamp: new Date(Date.now() - 3600000 * 2.8).toISOString(),
        is_demo: true
      },
      {
        id: "demo_act_5",
        customer_name: "Hamdan Al Maktoum",
        customer_email: "hamdan.m@example.ae",
        activity_type: "site_visit_requested",
        property_id: 1905,
        property_title: "Premium 1 BHK Luxury Residence at Jumeirah Lake Towers",
        details: "Requested VIP Chauffeur pickup from Downtown Dubai",
        timestamp: new Date(Date.now() - 3600000 * 1).toISOString(),
        is_demo: true
      }
    ];

    setLocalStoreCollection("customer_activities", demoActivities);

    const demoFollowUps: SalesFollowUp[] = [
      {
        id: "demo_fup_1",
        lead_id: "demo_lead_1",
        customer_name: "Hamdan Al Maktoum",
        agent_email: "rajesh.sharma@lykarealty.ae",
        agent_name: "Rajesh Sharma",
        note: "Call customer to re-confirm tomorrow's 2:00 PM viewing in JLT and coordinate chauffeur escort.",
        type: "call",
        due_date: new Date(Date.now() + 3600000 * 4).toISOString(),
        status: "pending",
        created_at: new Date(Date.now() - 86400000 * 1).toISOString(),
        is_demo: true
      },
      {
        id: "demo_fup_2",
        lead_id: "demo_lead_2",
        customer_name: "Ananya Deshmukh",
        agent_email: "rajesh.sharma@lykarealty.ae",
        agent_name: "Rajesh Sharma",
        note: "Send WhatsApp catalog with comparative price per sqft for Palm Jumeirah water-facing penthouses.",
        type: "whatsapp",
        due_date: new Date(Date.now() + 86400000 * 1).toISOString(),
        status: "pending",
        created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
        is_demo: true
      },
      {
        id: "demo_fup_3",
        lead_id: "demo_lead_4",
        customer_name: "Tariq Bin Sulayem",
        agent_email: "ananya.subramanian@lykarealty.ae",
        agent_name: "Ananya Subramanian",
        note: "Discuss developer 60/40 payment waiver with sales director.",
        type: "meeting",
        due_date: new Date(Date.now() - 3600000 * 3).toISOString(), // overdue
        status: "pending",
        created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
        is_demo: true
      }
    ];

    setLocalStoreCollection("follow_ups", demoFollowUps);

    const demoVisits: SalesSiteVisit[] = [
      {
        id: "demo_vis_1",
        lead_id: "demo_lead_1",
        customer_name: "Hamdan Al Maktoum",
        contact_phone: "+971 50 892 1102",
        contact_email: "hamdan.m@example.ae",
        property_id: 1905,
        property_title: "Premium 1 BHK Luxury Residence at Jumeirah Lake Towers",
        property_locality: "Jumeirah Lake Towers",
        property_price: 760887,
        property_image: "https://images.unsplash.com/photo-1546412414-e1885259563a?auto=format&fit=crop&w=1200&q=80",
        preferred_date: new Date(Date.now() + 86400000 * 1).toISOString().split("T")[0],
        preferred_time: "02:00 PM",
        notes: "VIP Client: Chauffeur escort requested from Downtown Dubai.",
        status: "confirmed",
        assigned_to_email: "rajesh.sharma@lykarealty.ae",
        created_at: new Date(Date.now() - 86400000 * 1).toISOString(),
        is_demo: true
      },
      {
        id: "demo_vis_2",
        lead_id: "demo_lead_3",
        customer_name: "Marcus Vance",
        contact_phone: "+44 7700 900321",
        contact_email: "m.vance@ukcapital.co.uk",
        property_id: 1904,
        property_title: "Luxury 1 Bedroom Signature Villa at Jumeirah Village Circle",
        property_locality: "Jumeirah Village Circle",
        property_price: 675000,
        property_image: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80",
        preferred_date: new Date(Date.now() + 86400000 * 2).toISOString().split("T")[0],
        preferred_time: "11:30 AM",
        notes: "Client arriving via Dubai International Airport.",
        status: "pending",
        assigned_to_email: "tariq.mansoor@lykarealty.ae",
        created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
        is_demo: true
      }
    ];

    setLocalStoreCollection("site_visits", demoVisits);
  }
};
