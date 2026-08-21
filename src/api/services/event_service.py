import os
import pandas as pd
from typing import List, Dict, Any, Optional

DATA_DIR = os.getenv("DATA_DIR", r"D:\hackathon project\energy-resilience\data")
PROCESSED_DIR = os.path.join(DATA_DIR, "processed")

def get_geopolitical_events(
    corridor_id: Optional[str] = None, 
    start_date: Optional[str] = None, 
    end_date: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Retrieves and filters normalized geopolitical events.
    """
    csv_path = os.path.join(PROCESSED_DIR, "geopolitical_events.csv")
    if not os.path.exists(csv_path):
        return []
        
    df = pd.read_csv(csv_path)
    
    # Map corridor column in CSV to corridor_id
    df = df.rename(columns={"corridor": "corridor_id"})
    
    # Fill NaN values for Pydantic schema compliance
    df["source_url"] = df["source_url"].fillna("")
    df["text_reference"] = df["text_reference"].fillna("")
    df["corridor_id"] = df["corridor_id"].fillna("UNMAPPED")
    
    # Filter by corridor
    if corridor_id:
        df = df[df["corridor_id"] == corridor_id.upper()]
        
    # Filter by date range
    if start_date:
        df = df[df["event_date"] >= start_date]
    if end_date:
        df = df[df["event_date"] <= end_date]
        
    df = df.sort_values("event_date", ascending=False)
    
    # Select columns matching schemas.GeopoliticalEventResponse
    selected_cols = ["event_id", "event_date", "source", "event_type", "corridor_id", "text_reference", "source_url"]
    df_out = df[selected_cols]
    
    return df_out.to_dict(orient="records")
