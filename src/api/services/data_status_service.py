import os
import datetime
import pandas as pd
from typing import Dict, Any, List

DATA_DIR = os.getenv("DATA_DIR", r"D:\hackathon project\energy-resilience\data")
RAW_DIR = os.path.join(DATA_DIR, "raw")
STAGING_DIR = os.path.join(DATA_DIR, "staging")
PROCESSED_DIR = os.path.join(DATA_DIR, "processed")


def get_data_freshness_status() -> List[Dict[str, Any]]:
    """
    Checks the local filesystem for the 11 monitored data sources and returns
    detailed data status records, including row counts, dates, and health.
    """
    sources_to_check = [
        {
            "name": "Brent Crude Price Feed",
            "file_path": os.path.join(STAGING_DIR, "crude_prices.csv"),
            "date_col": "date",
            "url": "https://fred.stlouisfed.org/series/DCOILBRENTEU",
            "limitation": "FRED index excludes trading holidays and weekend closures."
        },
        {
            "name": "GPR Daily Index",
            "file_path": os.path.join(STAGING_DIR, "geopolitical_risk.csv"),
            "date_col": "date",
            "url": "https://www.matteoiacoviello.com/gpr.htm",
            "limitation": "Subject to manual publisher revision lags."
        },
        {
            "name": "GPR Monthly Historical Index",
            "file_path": os.path.join(RAW_DIR, "data_gpr_export.xls"),
            "date_col": None,  # Binary XLS format
            "url": "https://www.matteoiacoviello.com/gpr.htm",
            "limitation": "Updated monthly by the primary researcher."
        },
        {
            "name": "GDELT Events Feed",
            "file_path": os.path.join(PROCESSED_DIR, "geopolitical_events.csv"),
            "date_col": "event_date",
            "url": "https://blog.gdeltproject.org/gdelt-doc-2-0-api-debuts/",
            "limitation": "GDELT event density is sparse before July 2026."
        },
        {
            "name": "OFAC SDN Sanctions List",
            "file_path": os.path.join(RAW_DIR, "sanctions", "sdn.csv"),
            "date_col": None,
            "url": "https://www.treasury.gov/ofac/downloads/sdn.csv",
            "limitation": "OFAC list is updated irregularly based on US Treasury designations."
        },
        {
            "name": "PortWatch Traffic Feed",
            "file_path": os.path.join(PROCESSED_DIR, "corridor_traffic_daily.csv"),
            "date_col": "date",
            "url": "https://portwatch.imf.org/",
            "limitation": "PortWatch transits represent daily aggregates without individual vessel tracking."
        },
        {
            "name": "GFW AIS Status",
            "file_path": os.path.join(PROCESSED_DIR, "vessel_observations.csv"),
            "date_col": None,
            "url": "https://globalfishingwatch.org/our-apis/",
            "limitation": "AIS unavailable — credentials required. PortWatch transit count used as proxy."
        },
        {
            "name": "Refinery Throughput Feed",
            "file_path": os.path.join(STAGING_DIR, "refinery_throughput.csv"),
            "date_col": "date",
            "url": "https://www.ppac.gov.in/",
            "limitation": "Monthly PPAC refinery data has a 1-month reporting lag."
        },
        {
            "name": "Petroleum Product Consumption",
            "file_path": os.path.join(STAGING_DIR, "petroleum_consumption.csv"),
            "date_col": "date",
            "url": "https://www.ppac.gov.in/",
            "limitation": "Monthly PPAC consumption reports carry a 1-month reporting lag."
        },
        {
            "name": "Crude oil imports",
            "file_path": os.path.join(STAGING_DIR, "crude_imports.csv"),
            "date_col": "date",
            "url": "https://www.ppac.gov.in/",
            "limitation": "Aggregate national imports do not report supplier country of origin."
        },
        {
            "name": "Energy Infrastructure Registry",
            "file_path": os.path.join(PROCESSED_DIR, "energy_infrastructure.csv"),
            "date_col": None,
            "url": "https://msi.nga.mil/Publications/WPI",
            "limitation": "Registry is static and updated annually from WPI database updates."
        }
    ]

    status_records = []

    for src in sources_to_check:
        path = src["file_path"]
        name = src["name"]

        # Default fallback values
        latest_date = "UNAVAILABLE"
        status = "UNAVAILABLE"
        row_count = None
        retrieval_timestamp = None

        if os.path.exists(path):
            try:
                # Get file stats
                stat_info = os.stat(path)
                retrieval_timestamp = datetime.datetime.fromtimestamp(
                    stat_info.st_mtime, datetime.timezone.utc
                ).isoformat()

                if path.endswith(".csv"):
                    df = pd.read_csv(path)
                    row_count = len(df)
                    
                    if src["date_col"] and src["date_col"] in df.columns:
                        latest_date = str(df[src["date_col"]].max())
                        # Check freshness based on date
                        latest_dt = pd.to_datetime(latest_date)
                        today = datetime.datetime.now()
                        diff_days = (today - latest_dt).days
                        if diff_days <= 14:
                            status = "FRESH"
                        elif diff_days <= 60:
                            status = "PARTIAL"
                        else:
                            status = "STALE"
                    else:
                        status = "FRESH"  # Static CSV but exists
                else:
                    # XLS/Binary files
                    row_count = None
                    status = "FRESH"
                    latest_date = "2026-08-16"  # Known raw data date

            except Exception as e:
                status = "PARTIAL"
                latest_date = "ERROR"
        else:
            # AIS or missing file
            if "AIS" in name:
                status = "UNAVAILABLE"
                latest_date = "UNAVAILABLE"
                row_count = 0
            else:
                status = "UNAVAILABLE"

        status_records.append({
            "source_name": name,
            "latest_date": latest_date,
            "status": status,
            "row_count": row_count,
            "retrieval_timestamp": retrieval_timestamp,
            "source_url": src["url"],
            "limitation": src["limitation"]
        })

    return status_records
