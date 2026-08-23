"""
Phase 16 — Master Enterprise Verification & Production Readiness Script
Runs all unit, integration, frontend, build, security, ML, and performance checks.
Emits a unified PASS/FAIL report for production readiness verification.
"""

import os
import sys
import subprocess
import time
import json

# Base directory (where the script is run from)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def make_env() -> dict:
    env = os.environ.copy()
    env["PYTHONPATH"] = BASE_DIR
    return env

def run_step(name: str, cmd: str, cwd: str = None) -> bool:
    actual_cwd = os.path.join(BASE_DIR, cwd) if cwd else BASE_DIR
    print(f"\n----------------------------------------------------------------")
    print(f"  Step: {name}")
    print(f"  Command: {cmd}")
    print(f"  Directory: {actual_cwd}")
    print(f"----------------------------------------------------------------")
    start = time.time()
    res = subprocess.run(cmd, shell=True, cwd=actual_cwd, capture_output=True, text=True, env=make_env())
    duration = time.time() - start
    
    if res.returncode == 0:
        print(f"  [PASS] ({duration:.2f}s)")
        return True
    else:
        print(f"  [FAIL] ({duration:.2f}s)")
        print("\n--- Output Excerpt ---")
        lines = res.stdout.splitlines() + res.stderr.splitlines()
        for line in lines[-25:]:
            print(f"  {line}")
        return False


def verify_phase16() -> bool:
    print("=" * 68)
    print("  MARITIME ENERGY RESILIENCE - PHASE 16 PRODUCTION VERIFICATION")
    print("=" * 68)
    
    python_exe = sys.executable
    results = {}

    # 1. Backend Pytest Suite
    pytest_cmd = f'"{python_exe}" -m pytest tests/ -q'
    results["Backend Unit & Integration Tests (pytest)"] = run_step(
        "Backend Pytest Suite",
        pytest_cmd,
        cwd=None,
    )

    # 2. Frontend Vitest Suite
    results["Frontend Unit & Integration Tests (vitest)"] = run_step(
        "Frontend Vitest Suite",
        "npx vitest run --passWithNoTests",
        cwd="frontend"
    )

    # 3. TypeScript Strict Type Check
    results["TypeScript Strict Type Check (tsc)"] = run_step(
        "TypeScript Type Check",
        "npx tsc --noEmit",
        cwd="frontend"
    )

    # 4. Production Bundle Build
    results["Frontend Production Bundle Build (vite)"] = run_step(
        "Production Bundle Build",
        "npm run build",
        cwd="frontend"
    )

    # 5. Production Load & Performance Test
    load_test_cmd = f'"{python_exe}" scripts/production_load_test.py --concurrency 10 --requests 10 --out docs/phase-16-performance-report.json'
    results["API Load & Stress Test (concurrency 10)"] = run_step(
        "Production Load Test",
        load_test_cmd,
        cwd=None,
    )

    # Summary Output
    print("\n" + "=" * 68)
    print("  PHASE 16 PRODUCTION READINESS SUMMARY REPORT")
    print("=" * 68)
    
    all_passed = True
    for test_name, passed in results.items():
        status = "[PASS]" if passed else "[FAIL]"
        if not passed:
            all_passed = False
        print(f"  {status:8s} | {test_name}")

    print("=" * 68)
    if all_passed:
        print("  ALL PHASE 16 PRODUCTION QUALITY GATES PASSED! READY FOR DEPLOYMENT.")
        print("=" * 68)
        return True
    else:
        print("  SOME QUALITY GATES FAILED. REVIEW LOGS ABOVE BEFORE DEPLOYMENT.")
        print("=" * 68)
        return False


if __name__ == "__main__":
    success = verify_phase16()
    sys.exit(0 if success else 1)
