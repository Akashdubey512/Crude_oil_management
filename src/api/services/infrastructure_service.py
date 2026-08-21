import os
import pandas as pd
from typing import List, Dict, Any

DATA_DIR = os.getenv("DATA_DIR", r"D:\hackathon project\energy-resilience\data")
PROCESSED_DIR = os.path.join(DATA_DIR, "processed")

def get_infrastructure_nodes() -> List[Dict[str, Any]]:
    """
    Reads energy_infrastructure.csv and returns all facility nodes.
    """
    csv_path = os.path.join(PROCESSED_DIR, "energy_infrastructure.csv")
    if not os.path.exists(csv_path):
        return []
        
    df = pd.read_csv(csv_path)
    # Convert capacity to float or None
    df["capacity"] = df["capacity"].apply(lambda val: float(val) if pd.notnull(val) else None)
    
    return df.to_dict(orient="records")
