from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.app.database import get_db
from backend.app.models.lead import Lead
from backend.app.models.property import Property
from backend.app.models.site_visit import SiteVisit
from backend.app.models.user import User
from backend.app.models.follow_up import FollowUpNote
from backend.app.schemas.analytics import (
    DashboardAnalyticsResponse,
    StatusCount,
    LocationCount,
    BudgetRangeCount,
    TimelineCount,
    PipelineStageCount,
    AgentPerformanceItem
)
from backend.app.services.auth.auth_service import get_current_agent

router = APIRouter(prefix="/dashboard", tags=["Dashboard Analytics"])

@router.get("/analytics", response_model=DashboardAnalyticsResponse)
def get_dashboard_analytics(
    db: Session = Depends(get_db),
    agent: User = Depends(get_current_agent)
):
    is_personal_agent = (agent.role == "agent")

    # Base query for leads
    base_lead_q = db.query(Lead)
    if is_personal_agent:
        base_lead_q = base_lead_q.filter(Lead.user_id == agent.id)

    total_leads = base_lead_q.count()
    hot_leads = base_lead_q.filter(Lead.lead_category == "HOT").count()
    warm_leads = base_lead_q.filter(Lead.lead_category == "WARM").count()
    cold_leads = base_lead_q.filter(Lead.lead_category == "COLD").count()
    
    total_props = db.query(Property).count()
    dataset_props = db.query(Property).filter(Property.is_dataset_record == True).count()
    demo_props = db.query(Property).filter(Property.is_dataset_record == False).count()
    
    visits_count = db.query(SiteVisit).count()
    converted_leads = base_lead_q.filter(Lead.pipeline_status == "converted").count()
    conversion_rate = round((converted_leads / total_leads * 100), 1) if total_leads > 0 else 0.0

    # Leads by category / status
    leads_by_status = [
        StatusCount(name="Hot Leads", count=hot_leads, percentage=round(hot_leads / max(total_leads, 1) * 100, 1), color="#EF4444"),
        StatusCount(name="Warm Leads", count=warm_leads, percentage=round(warm_leads / max(total_leads, 1) * 100, 1), color="#F59E0B"),
        StatusCount(name="Cold Leads", count=cold_leads, percentage=round(cold_leads / max(total_leads, 1) * 100, 1), color="#3B82F6"),
    ]

    # Leads by location
    loc_q = db.query(Lead.locality, func.count(Lead.id), func.avg(Lead.budget_max)).filter(Lead.locality.isnot(None))
    if is_personal_agent:
        loc_q = loc_q.filter(Lead.user_id == agent.id)
    loc_rows = loc_q.group_by(Lead.locality).order_by(func.count(Lead.id).desc()).limit(6).all()

    leads_by_location = [
        LocationCount(
            locality=loc or "Prime Dubai",
            count=count,
            avg_budget=round(avg_b or 2500000, 0)
        )
        for loc, count, avg_b in loc_rows
    ]
    if not leads_by_location:
        leads_by_location = [
            LocationCount(locality="Downtown Dubai", count=max(1, hot_leads), avg_budget=3200000),
            LocationCount(locality="Palm Jumeirah", count=max(1, warm_leads), avg_budget=4800000),
            LocationCount(locality="Dubai Marina", count=max(1, cold_leads), avg_budget=2100000),
        ]

    # Budget distribution
    budget_ranges = [
        ("Under 1.5M AED", 0, 1500000),
        ("1.5M - 2.5M AED", 1500000, 2500000),
        ("2.5M - 4.0M AED", 2500000, 4000000),
        ("4.0M - 7.0M AED", 4000000, 7000000),
        ("Above 7.0M AED", 7000000, 100000000)
    ]
    budget_distribution = []
    for label, bmin, bmax in budget_ranges:
        bq = db.query(Lead).filter(Lead.budget_max >= bmin, Lead.budget_max < bmax)
        if is_personal_agent:
            bq = bq.filter(Lead.user_id == agent.id)
        cnt = bq.count()
        budget_distribution.append(BudgetRangeCount(range_label=label, count=cnt))

    # Pipeline stages funnel
    stages = [
        ("new", "New Leads"),
        ("ai_qualified", "AI Qualified"),
        ("properties_recommended", "Recommended"),
        ("interested", "Interested"),
        ("site_visit", "Site Visit"),
        ("negotiation", "Negotiation"),
        ("converted", "Converted")
    ]
    pipeline_funnel = []
    for stage_key, stage_lbl in stages:
        sq = db.query(Lead).filter(Lead.pipeline_status == stage_key)
        if is_personal_agent:
            sq = sq.filter(Lead.user_id == agent.id)
        cnt = sq.count()
        pipeline_funnel.append(PipelineStageCount(stage=stage_key, label=stage_lbl, count=cnt))

    # Leads by timeline
    tq = base_lead_q
    leads_by_timeline = [
        TimelineCount(timeline="Immediate (30 Days)", count=tq.filter(Lead.purchase_timeline.ilike("%immediate%")).count()),
        TimelineCount(timeline="Within 3 Months", count=tq.filter(Lead.purchase_timeline.ilike("%3 month%")).count()),
        TimelineCount(timeline="Within 6 Months", count=tq.filter(Lead.purchase_timeline.ilike("%6 month%")).count()),
        TimelineCount(timeline="Long-term / Investor", count=tq.filter(Lead.purchase_timeline.ilike("%year%")).count()),
    ]

    # Calculate agent leaderboard for manager & admin oversight
    agent_leaderboard = []
    if not is_personal_agent:
        all_agents = db.query(User).filter(User.role == "agent").all()
        for ag in all_agents:
            ag_leads = db.query(Lead).filter(Lead.user_id == ag.id).all()
            ag_total = len(ag_leads)
            ag_hot = sum(1 for l in ag_leads if l.lead_category == "HOT")
            ag_conv = sum(1 for l in ag_leads if l.pipeline_status == "converted")
            ag_avg_score = round(sum(l.lead_score for l in ag_leads) / ag_total, 1) if ag_total > 0 else 0.0
            ag_rate = round((ag_conv / ag_total * 100), 1) if ag_total > 0 else 0.0
            ag_pending_fu = db.query(FollowUpNote).filter(FollowUpNote.agent_id == ag.id, FollowUpNote.status == "pending").count()

            agent_leaderboard.append(AgentPerformanceItem(
                agent_id=ag.id,
                agent_name=ag.full_name,
                email=ag.email,
                total_leads=ag_total,
                hot_leads=ag_hot,
                converted_leads=ag_conv,
                avg_lead_score=ag_avg_score,
                pending_follow_ups=ag_pending_fu,
                conversion_rate=ag_rate
            ))
        agent_leaderboard.sort(key=lambda x: (x.converted_leads, x.total_leads), reverse=True)

    return DashboardAnalyticsResponse(
        total_leads=total_leads,
        hot_leads=hot_leads,
        warm_leads=warm_leads,
        cold_leads=cold_leads,
        total_properties=total_props,
        dataset_properties=dataset_props,
        demo_properties=demo_props,
        scheduled_visits=visits_count,
        conversion_rate=conversion_rate,
        leads_by_status=leads_by_status,
        leads_by_location=leads_by_location,
        budget_distribution=budget_distribution,
        leads_by_timeline=leads_by_timeline,
        pipeline_funnel=pipeline_funnel,
        recent_activity_count=total_leads + visits_count,
        user_role=agent.role,
        agent_leaderboard=agent_leaderboard
    )
