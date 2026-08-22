"""
Smoke test for Phase 10 RED_SEA risk service integration.
Verifies that GET /api/risk/RED_SEA would return a real ML prediction, not UNKNOWN.
"""
import sys
import os
sys.path.insert(0, r"D:\hackathon project\energy-resilience")

from src.api.services.risk_service import get_risk_snapshot, get_all_risk_snapshots

print("=" * 60)
print("Smoke Test: RED_SEA Risk Snapshot")
print("=" * 60)
result = get_risk_snapshot("RED_SEA")

print(f"  corridor:     {result['corridor']}")
print(f"  risk_level:   {result['risk_level']}")
print(f"  risk_score:   {result['risk_score']}")
print(f"  probability:  {result['probability']}")
print(f"  prediction_date: {result['prediction_date']}")
print(f"  model_version: {result['model_version']}")
print(f"  top_factors:  {result['top_factors']}")
print(f"  decomposition: {result['risk_decomposition']}")
print(f"  limitations: {result['limitations'][:2]}")

if result['risk_level'] in ("UNKNOWN", "UNAVAILABLE"):
    print("\n[FAIL] risk_level is still UNKNOWN/UNAVAILABLE!")
    sys.exit(1)
else:
    print("\n[PASS] RED_SEA now returns a real ML-based risk level!")

print()
print("=" * 60)
print("Smoke Test: ALL Risk Snapshots")
print("=" * 60)
all_results = get_all_risk_snapshots()
for r in all_results:
    print(f"  {r['corridor']:15s}  level={r['risk_level']:12s}  prob={r['probability']}  score={r['risk_score']}")

print("\nDone.")
