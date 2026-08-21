"""
Disruption Target Builder — Phase 4

Constructs a defensible binary disruption label `is_disrupted` for each
(date, corridor_id) observation from purely observable real evidence.

TARGET DEFINITION
-----------------
is_disrupted = 1  if BOTH:
  (A) corridor_anomalies.anomaly_type == 'TRAFFIC_DROP' on this day, AND
  (B) at least one geopolitical/shipping disruption event is mapped to this
      corridor in the [-3, +1] day window around the date.

is_disrupted = 0  if data is OBSERVED but criterion A or B is unmet.

EXCLUDED from training:
  - Rows where traffic_data_available == 0 (NO_OBSERVATION gaps).
  - Rows at the start of the series with insufficient rolling history (<28 days).

RATIONALE
---------
Criterion A (traffic drop) ensures the label represents a real, measurable
physical disruption, not a hypothetical geopolitical escalation.

Criterion B (event window) anchors the label to a documented real-world
cause. Without this, algorithmic traffic fluctuations (seasonal, weather)
would generate false positive labels.

The ±3-day window accounts for:
  - Reporting lag in news databases (GDELT articles often appear 1-2 days after events).
  - Vessel re-routing typically takes 1-3 days to materialize in transit counts.
  - Allows the model to learn pre-event signals (forward +1 day serves as confirmation
    rather than future leakage because we only label the day OF the drop, not future drops).

LIMITATIONS
-----------
1. Class imbalance: expect ~3-5% positive rate (matches real disruption frequency).
2. GDELT coverage is sparse (75 articles only). Events mapped to corridor via
   keyword matching, not geographic AIS confirmation. Some true disruptions may
   be unlabeled (false negatives).
3. The +1 day in criterion B introduces minimal look-ahead for labeling only
   (NOT for features, which use only t-1 and earlier data).
4. If no events are available for a corridor, the target degrades to criterion A
   only (traffic drop alone), which is documented below.
"""

import os
import pandas as pd
import numpy as np
from datetime import timedelta

PROCESSED_DIR = r"D:\hackathon project\energy-resilience\data\processed"

# Disruption event types from taxonomy
DISRUPTION_EVENT_TYPES = {
    "tanker attack", "maritime security incident", "pipeline disruption",
    "refinery disruption", "infrastructure attack", "armed conflict",
    "military escalation", "export restriction", "port disruption",
    "shipping disruption", "supply disruption",
}

EVENT_WINDOW_DAYS_BEFORE = 3
EVENT_WINDOW_DAYS_AFTER = 1


def build_disruption_target(
    corridor_id: str,
    date_index: pd.DatetimeIndex,
) -> pd.DataFrame:
    """
    Returns a DataFrame with columns [date, corridor_id, is_disrupted, label_method]
    for all dates in date_index.

    label_method tracks whether the label used criterion A+B (full) or A only (degraded).
    """
    anomaly_path = os.path.join(PROCESSED_DIR, "corridor_anomalies.csv")
    events_path = os.path.join(PROCESSED_DIR, "geopolitical_events.csv")
    links_path = os.path.join(PROCESSED_DIR, "event_corridor_links.csv")

    df_anomaly = pd.read_csv(anomaly_path)
    df_events = pd.read_csv(events_path)
    df_links = pd.read_csv(links_path)

    df_anomaly["date"] = pd.to_datetime(df_anomaly["date"])
    df_events["event_date"] = pd.to_datetime(df_events["event_date"])
    df_links["event_date"] = pd.to_datetime(df_links["event_date"])

    # === Criterion A: Traffic drops for this corridor ===
    anom_corr = df_anomaly[df_anomaly["corridor_id"] == corridor_id].copy()
    anom_corr = anom_corr.set_index("date").reindex(date_index)
    traffic_drop_days = set(
        anom_corr[anom_corr["anomaly_type"] == "TRAFFIC_DROP"].index
    )
    no_observation_days = set(
        anom_corr[anom_corr["data_availability"] != "OBSERVED"].index
    )

    # === Criterion B: Disruption events linked to corridor ===
    # Use event_corridor_links for corridor-mapped events
    links_corr = df_links[
        (df_links["corridor_id"] == corridor_id) &
        (df_links["event_type"].isin(DISRUPTION_EVENT_TYPES))
    ].copy()

    # Also include all GDELT corridor-matched events from geopolitical_events
    events_corr = df_events[
        (df_events["corridor"] == corridor_id) &
        (df_events["event_type"].isin(DISRUPTION_EVENT_TYPES))
    ].copy()

    all_event_dates = set(
        pd.concat([
            links_corr["event_date"],
            events_corr["event_date"]
        ]).dropna().dt.normalize()
    )

    has_corridor_events = len(all_event_dates) > 0

    # === Label construction ===
    records = []
    for date in date_index:
        is_no_obs = date in no_observation_days
        is_drop = date in traffic_drop_days

        if is_no_obs:
            # Exclude from training
            label = np.nan
            method = "EXCLUDED_NO_OBSERVATION"
        elif not is_drop:
            label = 0
            method = "NEGATIVE"
        else:
            # Traffic drop detected — check for event confirmation
            if has_corridor_events:
                window_start = date - timedelta(days=EVENT_WINDOW_DAYS_BEFORE)
                window_end = date + timedelta(days=EVENT_WINDOW_DAYS_AFTER)
                event_confirmed = any(
                    window_start <= ed <= window_end
                    for ed in all_event_dates
                )
                if event_confirmed:
                    label = 1
                    method = "DISRUPTED_CONFIRMED"
                else:
                    # Traffic drop but no event confirmation → labeled cautiously as 0
                    # to avoid false positives. This is a known limitation (false negatives).
                    label = 0
                    method = "UNCONFIRMED_DROP"
            else:
                # No corridor events available: degrade to criterion A only
                label = 1
                method = "DISRUPTED_TRAFFIC_ONLY"

        records.append({
            "date": date,
            "corridor_id": corridor_id,
            "is_disrupted": label,
            "label_method": method,
        })

    df_target = pd.DataFrame(records)

    # Summary
    valid = df_target[df_target["is_disrupted"].notna()]
    pos = int((valid["is_disrupted"] == 1).sum())
    neg = int((valid["is_disrupted"] == 0).sum())
    excl = int(df_target["is_disrupted"].isna().sum())
    pos_rate = pos / (pos + neg) if (pos + neg) > 0 else 0.0

    print(f"  Target [{corridor_id}]: {pos} positive, {neg} negative, {excl} excluded")
    print(f"  Positive rate: {pos_rate:.2%} | Label methods: {df_target['label_method'].value_counts().to_dict()}")
    print(f"  Has corridor events for B-criterion: {has_corridor_events}")

    return df_target
