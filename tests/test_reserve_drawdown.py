import pytest
from fastapi.testclient import TestClient
from src.api.main import app
from src.risk.reserve_drawdown import (
    calculate_reserve_drawdown_schedule,
    CORRIDOR_BASELINE_IMPORT_MBPD,
    INDIA_NATIONAL_CRUDE_DEMAND_MBPD,
)

client = TestClient(app)


def test_normal_supply_gap_front_loaded():
    """Tests normal supply-gap scenario with front-loaded strategy."""
    gap_mbpd = 1.2
    duration_days = 8  # 8 days < 9.5 spr_days
    spr_days = 9.5

    result = calculate_reserve_drawdown_schedule(
        predicted_supply_gap_mbpd=gap_mbpd,
        disruption_duration_days=duration_days,
        spr_buffer_days=spr_days,
        strategy="front_loaded",
    )

    assert result["strategy"] == "front_loaded"
    assert result["predicted_supply_gap_mbpd"] == 1.2
    assert result["disruption_duration_days"] == 8
    assert result["buffer_exhausted"] is False
    assert result["warning_message"] is None
    assert len(result["schedule"]) == 8

    # Total recommended release should equal total required volume (1.2 * 8 = 9.6)
    expected_total = gap_mbpd * duration_days
    assert abs(result["total_recommended_release_mbpd"] - expected_total) < 0.01

    # Front-loaded: Day 1 release > Day 8 release
    day1_release = result["schedule"][0]["recommended_release_mbpd"]
    day8_release = result["schedule"][-1]["recommended_release_mbpd"]
    assert day1_release > day8_release

    # Remaining SPR buffer should decrease
    assert result["schedule"][-1]["remaining_spr_buffer_days"] < spr_days


def test_normal_supply_gap_smoothed():
    """Tests normal supply-gap scenario with smoothed (uniform) strategy."""
    gap_mbpd = 1.0
    duration_days = 8
    spr_days = 9.5

    result = calculate_reserve_drawdown_schedule(
        predicted_supply_gap_mbpd=gap_mbpd,
        disruption_duration_days=duration_days,
        spr_buffer_days=spr_days,
        strategy="smoothed",
    )

    assert result["strategy"] == "smoothed"
    assert len(result["schedule"]) == 8

    # Smoothed strategy: Day 1 release == Day 8 release
    releases = [entry["recommended_release_mbpd"] for entry in result["schedule"]]
    assert all(abs(r - releases[0]) < 0.001 for r in releases)


def test_zero_supply_gap_edge_case():
    """Tests zero-gap edge case where no drawdown is needed."""
    result = calculate_reserve_drawdown_schedule(
        predicted_supply_gap_mbpd=0.0,
        disruption_duration_days=10,
        spr_buffer_days=9.5,
    )

    assert result["predicted_supply_gap_mbpd"] == 0.0
    assert result["total_recommended_release_mbpd"] == 0.0
    assert result["buffer_exhausted"] is False
    assert result["warning_message"] is None
    assert len(result["schedule"]) == 0


def test_buffer_exhausted_duration_exceeds():
    """Tests edge case where disruption duration exceeds available SPR buffer days."""
    result = calculate_reserve_drawdown_schedule(
        predicted_supply_gap_mbpd=1.5,
        disruption_duration_days=15,  # 15 days > 9.5 days buffer
        spr_buffer_days=9.5,
    )

    assert result["buffer_exhausted"] is True
    assert result["warning_message"] is not None
    assert "CRITICAL" in result["warning_message"] or "WARNING" in result["warning_message"]


def test_buffer_exhausted_volume_exceeds():
    """Tests edge case where required release volume exceeds SPR capacity."""
    result = calculate_reserve_drawdown_schedule(
        predicted_supply_gap_mbpd=6.0,  # 6.0 MBPD > 5.0 national demand
        disruption_duration_days=9,
        spr_buffer_days=9.5,
    )

    assert result["buffer_exhausted"] is True
    assert result["warning_message"] is not None


def test_scenario_api_integration():
    """Integration test: verifies /api/scenarios/simulate returns drawdown_schedule."""
    payload = {
        "corridor_id": "HORMUZ",
        "tanker_transit_multiplier": 0.6,  # 40% drop
        "gpr_multiplier": 1.5,
        "spr_buffer_days": 9.5,
        "drawdown_strategy": "front_loaded",
    }
    response = client.post("/api/scenarios/simulate", json=payload)
    assert response.status_code == 200

    data = response.json()
    assert "drawdown_schedule" in data
    ds = data["drawdown_schedule"]
    assert ds is not None
    assert ds["strategy"] == "front_loaded"
    assert ds["predicted_supply_gap_mbpd"] > 0
    assert len(ds["schedule"]) > 0
    assert "heuristic_note" in ds
