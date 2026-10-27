import sqlite3
import json

def view_recent_leads():
    conn = sqlite3.connect("lyka_realty.db")
    c = conn.cursor()
    c.execute("""
        SELECT id, customer_name, email, phone, locality, property_type, bhk, budget_max, lead_score, lead_category, lead_type, pipeline_status, created_at
        FROM leads
        ORDER BY id DESC
        LIMIT 10
    """)
    rows = c.fetchall()
    
    print("\n" + "="*90)
    print("                     LYKA REALTY - DATABASE LEADS (lyka_realty.db)")
    print("="*90)
    if not rows:
        print("No leads recorded in database yet.")
    else:
        for r in rows:
            lid, name, email, phone, locality, ptype, bhk, budget, score, cat, ltype, status, created = r
            contact = email or phone or "No contact"
            bhk_str = f"{bhk} BHK" if bhk is not None else "N/A"
            budget_str = f"AED {budget:,.0f}" if budget else "N/A"
            print(f"ID #{lid} | Name: {name:<18} | Contact: {contact:<25} | Locality: {locality or 'Dubai':<15}")
            print(f"       Type: {ptype or 'Apartment'} ({bhk_str}) | Budget: {budget_str:<15} | Score: {score}/100 ({cat}) | Status: {status}")
            print(f"       Created: {created}")
            print("-" * 90)
    print("="*90 + "\n")

if __name__ == "__main__":
    view_recent_leads()
