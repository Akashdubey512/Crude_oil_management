import sys
import os
import json
import datetime
import pandas as pd

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.risk.service import get_corridor_risk_with_explanation

PROCESSED_DIR = r"D:\hackathon project\energy-resilience\data\processed"

def main():
    print("Running active corridor risk engine...")
    
    # Resolve the latest date from daily traffic
    traffic_path = os.path.join(PROCESSED_DIR, "corridor_traffic_daily.csv")
    if not os.path.exists(traffic_path):
        print("[ERROR] corridor_traffic_daily.csv not found. Execute pipeline first.")
        sys.exit(1)
        
    df = pd.read_csv(traffic_path)
    latest_date_str = df["date"].max()
    latest_date = datetime.datetime.strptime(latest_date_str, "%Y-%m-%d").date()
    
    print(f"Target calculation date: {latest_date}")
    
    active_risks = []
    for corridor_id in ["HORMUZ", "BAB_EL_MANDEB", "SUEZ"]:
        print(f"  Calculating risk for {corridor_id}...")
        risk_rec = get_corridor_risk_with_explanation(corridor_id, latest_date)
        active_risks.append(risk_rec)
        print(f"    Risk level: {risk_rec.get('risk_level')} | Prob: {risk_rec.get('risk_probability')}")
        
    output_path = os.path.join(PROCESSED_DIR, "active_corridor_risks.json")
    with open(output_path, "w") as f:
        json.dump(active_risks, f, indent=2, default=str)
        
    print(f"\nSaved active corridor risk snapshot to {output_path}")

if __name__ == "__main__":
    main()
