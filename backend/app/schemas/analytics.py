from pydantic import BaseModel
from typing import List, Dict, Any, Optional

class StatusCount(BaseModel):
    name: str
    count: int
    percentage: float
    color: str

class LocationCount(BaseModel):
    locality: str
    count: int
    avg_budget: float

class BudgetRangeCount(BaseModel):
    range_label: str
    count: int

class TimelineCount(BaseModel):
    timeline: str
    count: int

class PipelineStageCount(BaseModel):
    stage: str
    label: str
    count: int

class AgentPerformanceItem(BaseModel):
    agent_id: int
    agent_name: str
    email: str
    total_leads: int
    hot_leads: int
    converted_leads: int
    avg_lead_score: float
    pending_follow_ups: int
    conversion_rate: float

class DashboardAnalyticsResponse(BaseModel):
    total_leads: int
    hot_leads: int
    warm_leads: int
    cold_leads: int
    total_properties: int
    dataset_properties: int
    demo_properties: int
    scheduled_visits: int
    conversion_rate: float
    leads_by_status: List[StatusCount]
    leads_by_location: List[LocationCount]
    budget_distribution: List[BudgetRangeCount]
    leads_by_timeline: List[TimelineCount]
    pipeline_funnel: List[PipelineStageCount]
    recent_activity_count: int
    user_role: Optional[str] = "agent"
    agent_leaderboard: Optional[List[AgentPerformanceItem]] = []
