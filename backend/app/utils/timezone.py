from datetime import datetime, timezone, timedelta

# Dubai is in Gulf Standard Time (GST), which is fixed at UTC+4 (no daylight saving)
DUBAI_TZ = timezone(timedelta(hours=4))
# India is in Indian Standard Time (IST), UTC+5:30
INDIA_TZ = timezone(timedelta(hours=5, minutes=30))

def get_dubai_now() -> datetime:
    """Returns current datetime in Dubai timezone (UTC+4)."""
    return datetime.now(DUBAI_TZ)

def to_dubai_time(dt: datetime) -> datetime:
    """
    Ensures datetime is in Dubai timezone (UTC+4).
    In SQLite, datetimes are stored without timezone offset but already in Dubai local time.
    Therefore, naive datetimes must have DUBAI_TZ attached directly.
    """
    if dt is None:
        return get_dubai_now()
    if dt.tzinfo is None:
        return dt.replace(tzinfo=DUBAI_TZ)
    return dt.astimezone(DUBAI_TZ)

def format_dubai_iso(dt: datetime) -> str:
    """Formats datetime as ISO 8601 with Dubai +04:00 offset."""
    dubai_dt = to_dubai_time(dt)
    return dubai_dt.isoformat()
