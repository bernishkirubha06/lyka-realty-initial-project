export interface Property {
  id: number;
  title: string;
  description?: string;
  city: string;
  locality: string;
  property_type: string;
  bhk: number;
  bathrooms: number;
  super_area_sqft: number;
  carpet_area_sqft?: number;
  price: number;
  currency: string;
  price_per_sqft?: number;
  floor_number?: number;
  total_floors?: number;
  property_age?: number;
  furnishing_status: string;
  parking: boolean;
  lift_available: boolean;
  gated_community: boolean;
  distance_to_metro_km: number;
  distance_to_city_center_km: number;
  amenities: string;
  parsed_amenities?: string[];
  latitude?: number;
  longitude?: number;
  image_url?: string;
  availability: string;
  quality: string;
  view_type?: string;
  is_dataset_record: boolean;
  created_at: string;
}

export interface PropertyListResponse {
  items: Property[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface LeadRequirements {
  customer_name?: string | null;
  email?: string | null;
  phone?: string | null;
  lead_type?: string | null;
  purpose?: string | null;
  city?: string;
  locality?: string | null;
  property_type?: string;
  bhk?: number | null;
  budget_min?: number | null;
  budget_max?: number | null;
  currency?: string;
  preferred_features?: string[];
  purchase_timeline?: string | null;
}

export interface LeadScoreBreakdown {
  total_score: number;
  category: "HOT" | "WARM" | "COLD" | "HIGH" | "MEDIUM" | "LOW";
  badge: string;
  explanation: string;
  factors: Record<string, number>;
}

export interface RecommendationItem {
  property: Property;
  match_score: number;
  reasons: string[];
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
}

export interface ChatRequest {
  message: string;
  conversation_id?: number;
  lead_id?: number;
  existing_requirements?: LeadRequirements;
  history?: ChatMessage[];
}

export interface ChatResponse {
  reply: string;
  conversation_id: number;
  lead_id: number;
  extracted_requirements: LeadRequirements;
  lead_score: LeadScoreBreakdown;
  recommendations: RecommendationItem[];
  missing_fields: string[];
  has_exact_match: boolean;
}

export interface FollowUpNote {
  id: number;
  lead_id: number;
  agent_id?: number | null;
  agent_name?: string | null;
  note: string;
  due_date?: string | null;
  status: string;
  created_at: string;
}

export interface Lead {
  id: number;
  user_id?: number | null;
  assigned_agent_name?: string | null;
  customer_name: string;
  email?: string | null;
  phone?: string | null;
  lead_type?: string | null;
  purpose?: string | null;
  city: string;
  locality?: string | null;
  property_type: string;
  bhk?: number | null;
  budget_min?: number | null;
  budget_max?: number | null;
  currency: string;
  purchase_timeline?: string | null;
  preferred_features: string[];
  lead_score: number;
  lead_category: "HOT" | "WARM" | "COLD" | "HIGH" | "MEDIUM" | "LOW";
  lead_explanation?: string | null;
  ai_summary?: string | null;
  pipeline_status: string;
  address?: string | null;
  country?: string | null;
  gender?: string | null;
  dob?: string | null;
  last_interaction: string;
  created_at: string;
  recommended_properties?: RecommendationItem[];
  follow_ups?: FollowUpNote[];
}

export interface SiteVisit {
  id: number;
  user_id?: number | null;
  lead_id?: number | null;
  property_id: number;
  customer_name: string;
  contact_phone: string;
  contact_email?: string | null;
  preferred_date: string;
  preferred_time: string;
  notes?: string | null;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  created_at: string;
  property?: Property;
}

export interface User {
  id: number;
  email: string;
  full_name: string;
  phone?: string | null;
  role: "agent" | "manager" | "admin" | "customer";
  address?: string | null;
  country?: string | null;
  gender?: string | null;
  dob?: string | null;
  created_at: string;
}

export interface AgentPerformanceItem {
  agent_id: number;
  agent_name: string;
  email: string;
  total_leads: number;
  hot_leads: number;
  converted_leads: number;
  avg_lead_score: number;
  pending_follow_ups: number;
  conversion_rate: number;
}

export interface DashboardAnalytics {
  total_leads: number;
  hot_leads: number;
  warm_leads: number;
  cold_leads: number;
  total_properties: number;
  dataset_properties: number;
  demo_properties: number;
  scheduled_visits: number;
  conversion_rate: number;
  leads_by_status: { name: string; count: number; percentage: number; color: string }[];
  leads_by_location: { locality: string; count: number; avg_budget: number }[];
  budget_distribution: { range_label: string; count: number }[];
  leads_by_timeline: { timeline: string; count: number }[];
  pipeline_funnel: { stage: string; label: string; count: number }[];
  recent_activity_count: number;
  user_role?: string;
  agent_leaderboard?: AgentPerformanceItem[];
}

export interface SystemLogEntry {
  timestamp: string;
  level: string;
  module: string;
  message: string;
}

export interface SystemAuditResponse {
  db_size_kb: number;
  total_staff: number;
  total_leads: number;
  total_properties: number;
  ai_status: string;
  system_version: string;
  recent_logs: SystemLogEntry[];
}

export interface SearchHistoryItem {
  id: number;
  user_id?: number | null;
  property_id?: number | null;
  property_title?: string | null;
  search_query?: string | null;
  locality?: string | null;
  bhk?: number | null;
  price?: number | null;
  visit_count?: number;
  created_at: string;
  property?: Property;
  ai_recommendations?: Property[];
}
