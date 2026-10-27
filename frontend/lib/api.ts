import {
  Property,
  PropertyListResponse,
  ChatRequest,
  ChatResponse,
  LeadRequirements,
  Lead,
  SiteVisit,
  DashboardAnalytics,
  User,
  RecommendationItem,
  FollowUpNote,
  SystemAuditResponse,
  SearchHistoryItem
} from "./types";

const getBaseUrl = (): string => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    // Always prefer 127.0.0.1 over localhost to prevent Windows IPv6 (::1) connection refused issues
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return "http://127.0.0.1:8000/api";
    }
    if (hostname) {
      return `http://${hostname}:8000/api`;
    }
  }
  return "http://127.0.0.1:8000/api";
};

export const BASE_URL = getBaseUrl();

function getAuthHeader(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("propai_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}${endpoint}`;
  const headers = {
    "Content-Type": "application/json",
    ...getAuthHeader(),
    ...(options.headers || {})
  };

  try {
    const res = await fetch(url, { ...options, headers });
    if (!res.ok) {
      let errMsg = `Request failed: ${res.status}`;
      try {
        const errJson = await res.json();
        errMsg = errJson.detail || errMsg;
      } catch {}
      throw new Error(errMsg);
    }
    return await res.json();
  } catch (err: any) {
    // If direct fetch to backend failed (e.g. host binding issue), retry via Next.js /api proxy rewrite
    if (typeof window !== "undefined" && !endpoint.startsWith("http")) {
      try {
        const fallbackUrl = `/api${endpoint}`;
        const fallbackRes = await fetch(fallbackUrl, { ...options, headers });
        if (fallbackRes.ok) {
          return await fallbackRes.json();
        }
      } catch {}
    }
    console.error(`API Error on ${endpoint}:`, err);
    throw err;
  }
}

export const api = {
  // Authentication
  async register(data: { 
    email: string; 
    password: string; 
    full_name: string; 
    phone?: string; 
    role?: string;
    address?: string;
    country?: string;
    gender?: string;
    dob?: string;
  }) {
    const res = await request<{ access_token: string; user: User }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(data)
    });
    if (res.access_token && typeof window !== "undefined") {
      localStorage.setItem("propai_token", res.access_token);
      localStorage.setItem("propai_user", JSON.stringify(res.user));
    }
    return res;
  },

  async login(data: { email: string; password: string }) {
    const res = await request<{ access_token: string; user: User }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(data)
    });
    if (res.access_token && typeof window !== "undefined") {
      localStorage.setItem("propai_token", res.access_token);
      localStorage.setItem("propai_user", JSON.stringify(res.user));
    }
    return res;
  },

  async getMe(): Promise<User> {
    return request<User>("/auth/me");
  },

  logout() {
    if (typeof window !== "undefined") {
      localStorage.removeItem("propai_token");
      localStorage.removeItem("propai_user");
    }
  },

  // AI Assistant
  async sendChatMessage(payload: ChatRequest): Promise<ChatResponse> {
    return request<ChatResponse>("/ai/chat", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },

  async extractRequirements(text: string, existing?: LeadRequirements) {
    return request<{ requirements: LeadRequirements; confidence: number }>("/ai/extract-requirements", {
      method: "POST",
      body: JSON.stringify({ text, existing_requirements: existing })
    });
  },

  async transcribeVoice(sampleText?: string, audioBlob?: Blob): Promise<{ transcription: string; confidence: number }> {
    const baseUrl = getBaseUrl();
    if (audioBlob) {
      const formData = new FormData();
      formData.append("file", audioBlob, "voice_input.wav");
      const url = `${baseUrl}/ai/voice/transcribe`;
      const res = await fetch(url, {
        method: "POST",
        body: formData,
        headers: getAuthHeader()
      });
      return await res.json();
    } else {
      const formData = new FormData();
      if (sampleText) formData.append("sample_text", sampleText);
      const url = `${baseUrl}/ai/voice/transcribe`;
      const res = await fetch(url, {
        method: "POST",
        body: formData,
        headers: getAuthHeader()
      });
      return await res.json();
    }
  },

  // Properties
  async getProperties(params: {
    city?: string;
    locality?: string;
    property_type?: string;
    bhk?: number;
    min_price?: number;
    max_price?: number;
    min_area?: number;
    max_area?: number;
    furnishing?: string;
    parking?: boolean;
    is_dataset_record?: boolean;
    sort?: string;
    page?: number;
    page_size?: number;
  } = {}): Promise<PropertyListResponse> {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") {
        query.append(k, String(v));
      }
    });
    return request<PropertyListResponse>(`/properties?${query.toString()}`);
  },

  async getProperty(id: number): Promise<Property> {
    return request<Property>(`/properties/${id}`);
  },

  async createProperty(data: Partial<Property>): Promise<Property> {
    return request<Property>("/properties", {
      method: "POST",
      body: JSON.stringify(data)
    });
  },

  async updateProperty(id: number, data: Partial<Property>): Promise<Property> {
    return request<Property>(`/properties/${id}`, {
      method: "PUT",
      body: JSON.stringify(data)
    });
  },

  async deleteProperty(id: number): Promise<{ message: string }> {
    return request<{ message: string }>(`/properties/${id}`, {
      method: "DELETE"
    });
  },

  // Leads CRM
  async getLeads(params: { 
    scope?: "mine" | "team"; 
    agent_id?: number; 
    category?: string; 
    status_filter?: string; 
    search?: string;
  } = {}): Promise<Lead[]> {
    const query = new URLSearchParams();
    if (params.scope) query.append("scope", params.scope);
    if (params.agent_id) query.append("agent_id", String(params.agent_id));
    if (params.category) query.append("category", params.category);
    if (params.status_filter) query.append("status_filter", params.status_filter);
    if (params.search) query.append("search", params.search);
    return request<Lead[]>(`/leads?${query.toString()}`);
  },

  async createLead(data: any): Promise<Lead> {
    return request<Lead>("/leads", {
      method: "POST",
      body: JSON.stringify(data)
    });
  },

  async getLead(id: number): Promise<Lead> {
    return request<Lead>(`/leads/${id}`);
  },

  async getMyLead(): Promise<Lead | null> {
    return request<Lead | null>("/leads/my-lead");
  },

  async getMyLeads(): Promise<Lead[]> {
    return request<Lead[]>("/leads/my-leads");
  },

  async updateLead(id: number, data: Partial<Lead>): Promise<Lead> {
    return request<Lead>(`/leads/${id}`, {
      method: "PUT",
      body: JSON.stringify(data)
    });
  },

  async assignLead(leadId: number, agentId: number): Promise<Lead> {
    return request<Lead>(`/leads/${leadId}/assign`, {
      method: "PATCH",
      body: JSON.stringify({ agent_id: agentId })
    });
  },

  // Follow-ups CRM
  async addFollowUp(leadId: number, data: { note: string; due_date?: string }): Promise<FollowUpNote> {
    return request<FollowUpNote>(`/leads/${leadId}/follow-ups`, {
      method: "POST",
      body: JSON.stringify(data)
    });
  },

  async completeFollowUp(noteId: number): Promise<{ message: string }> {
    return request<{ message: string }>(`/leads/follow-ups/${noteId}/complete`, {
      method: "PATCH"
    });
  },

  async getFollowUpsDueToday(): Promise<FollowUpNote[]> {
    return request<FollowUpNote[]>("/leads/follow-ups/due-today");
  },

  // Administrator Controls
  async getAdminUsers(): Promise<User[]> {
    return request<User[]>("/admin/users");
  },

  async createStaffUser(data: { email: string; password: string; full_name: string; role: string; phone?: string }): Promise<User> {
    return request<User>("/admin/users", {
      method: "POST",
      body: JSON.stringify(data)
    });
  },

  async updateUserRole(userId: number, role: string): Promise<User> {
    return request<User>(`/admin/users/${userId}/role`, {
      method: "PATCH",
      body: JSON.stringify({ role })
    });
  },

  async updateStaffPassword(userId: number, password: string): Promise<{ message: string; id: number }> {
    return request<{ message: string; id: number }>(`/admin/users/${userId}/password`, {
      method: "PUT",
      body: JSON.stringify({ password })
    });
  },

  async deleteStaffUser(userId: number): Promise<{ message: string }> {
    return request<{ message: string }>(`/admin/users/${userId}`, {
      method: "DELETE"
    });
  },

  async getAdminLogs(): Promise<SystemAuditResponse> {
    return request<SystemAuditResponse>("/admin/logs");
  },

  async seedDemoData(): Promise<{ status: string; message: string }> {
    return request<{ status: string; message: string }>("/admin/seed-demo", {
      method: "POST"
    });
  },

  // Recommendations
  async getRecommendations(req: LeadRequirements, limit: number = 5): Promise<RecommendationItem[]> {
    return request<RecommendationItem[]>(`/recommendations?limit=${limit}`, {
      method: "POST",
      body: JSON.stringify(req)
    });
  },

  async getRecommendationsForLead(leadId: number, limit: number = 5): Promise<RecommendationItem[]> {
    return request<RecommendationItem[]>(`/recommendations/${leadId}?limit=${limit}`);
  },

  // Site Visits
  async requestSiteVisit(data: {
    property_id: number;
    preferred_date: string;
    preferred_time: string;
    customer_name: string;
    contact_phone: string;
    contact_email?: string;
    notes?: string;
    lead_id?: number;
  }): Promise<SiteVisit> {
    return request<SiteVisit>("/site-visits", {
      method: "POST",
      body: JSON.stringify(data)
    });
  },

  async getAllSiteVisits(): Promise<SiteVisit[]> {
    return request<SiteVisit[]>("/site-visits");
  },

  async getMySiteVisits(): Promise<SiteVisit[]> {
    return request<SiteVisit[]>("/site-visits/my-visits");
  },

  async updateSiteVisit(id: number, data: { status: string }): Promise<SiteVisit> {
    return request<SiteVisit>(`/site-visits/${id}`, {
      method: "PUT",
      body: JSON.stringify(data)
    });
  },

  async cancelSiteVisit(id: number): Promise<SiteVisit> {
    return request<SiteVisit>(`/site-visits/${id}/cancel`, {
      method: "POST"
    });
  },

  // Search History & Last Searched Properties
  async recordSearchHistory(data: {
    property_id?: number;
    property_title?: string;
    search_query?: string;
    locality?: string;
    bhk?: number;
    price?: number;
  }): Promise<SearchHistoryItem> {
    return request<SearchHistoryItem>("/search-history", {
      method: "POST",
      body: JSON.stringify(data)
    });
  },

  async getSearchHistory(): Promise<SearchHistoryItem[]> {
    return request<SearchHistoryItem[]>("/search-history");
  },

  // Saved Properties
  async getSavedProperties(): Promise<Property[]> {
    return request<Property[]>("/saved-properties");
  },

  async toggleSavedProperty(propertyId: number): Promise<{ saved: boolean }> {
    return request<{ saved: boolean }>(`/saved-properties/${propertyId}`, {
      method: "POST"
    });
  },

  // Analytics
  async getDashboardAnalytics(): Promise<DashboardAnalytics> {
    return request<DashboardAnalytics>("/dashboard/analytics");
  }
};
