import pandas as pd
import numpy as np
import datetime

def detect_traffic_anomalies(df_traffic):
    """
    Detects daily traffic anomalies based on deviations from a rolling 28-day median.
    Correctly fills calendar timelines to distinguish NO_OBSERVATION from ZERO_TRAFFIC.
    """
    if df_traffic.empty:
        return pd.DataFrame(columns=[
            "date", "corridor_id", "tanker_count", "vessel_count",
            "rolling_median_28d", "rolling_std_28d", "anomaly_flag", 
            "anomaly_type", "data_availability"
        ])
        
    df_traffic = df_traffic.copy()
    df_traffic["date"] = pd.to_datetime(df_traffic["date"])
    
    anomalies_list = []
    
    # Process each corridor separately
    for corridor_id, group in df_traffic.groupby("corridor_id"):
        group = group.sort_values("date").reset_index(drop=True)
        
        # 1. Reindex to a complete daily calendar range to expose missing days (NO_OBSERVATION)
        min_date = group["date"].min()
        max_date = group["date"].max()
        full_range = pd.date_range(start=min_date, end=max_date, freq="D")
        
        group = group.set_index("date").reindex(full_range).reset_index().rename(columns={"index": "date"})
        
        # 2. Add data availability label
        # If tanker_count is null, it's a gap in data transmission (NO_OBSERVATION)
        # If tanker_count is 0, it's an actual observation of no tankers (ZERO_TRAFFIC)
        group["data_availability"] = np.where(
            group["tanker_count"].isna(), 
            "NO_OBSERVATION", 
            "OBSERVED"
        )
        
        # 3. Compute rolling stats on actual observed records (ignoring gaps)
        # We temporarily forward fill just to calculate rolling statistics, but we preserve
        # the original NaNs for the counts and output flags.
        temp_series = group["tanker_count"].ffill()
        
        rolling_median = temp_series.rolling(window=28, min_periods=7).median()
        rolling_std = temp_series.rolling(window=28, min_periods=7).std()
        
        group["rolling_median_28d"] = rolling_median
        group["rolling_std_28d"] = rolling_std
        
        # 4. Detect deviations of > 2 standard deviations
        # Only compute flags for observed records
        anomaly_flag = np.zeros(len(group), dtype=bool)
        anomaly_type = ["NORMAL"] * len(group)
        
        for idx, row in group.iterrows():
            if row["data_availability"] == "OBSERVED":
                val = row["tanker_count"]
                med = row["rolling_median_28d"]
                std = row["rolling_std_28d"]
                
                if pd.notnull(val) and pd.notnull(med) and pd.notnull(std) and std > 0:
                    deviation = val - med
                    if deviation < -2 * std:
                        anomaly_flag[idx] = True
                        anomaly_type[idx] = "TRAFFIC_DROP"
                    elif deviation > 2 * std:
                        anomaly_flag[idx] = True
                        anomaly_type[idx] = "CONGESTION"
            else:
                anomaly_type[idx] = "UNKNOWN" # Missing observation days cannot evaluate anomalies
                
        group["anomaly_flag"] = anomaly_flag
        group["anomaly_type"] = anomaly_type
        group["corridor_id"] = corridor_id
        
        # Select target output columns
        group_out = group[[
            "date", "corridor_id", "tanker_count", "vessel_count",
            "rolling_median_28d", "rolling_std_28d", "anomaly_flag", 
            "anomaly_type", "data_availability"
        ]]
        anomalies_list.append(group_out)
        
    df_anomalies = pd.concat(anomalies_list, ignore_index=True)
    df_anomalies["date"] = df_anomalies["date"].dt.strftime("%Y-%m-%d")
    return df_anomalies
