import os
import json
import hashlib

BASE_DIR = r"D:\hackathon project\energy-resilience"

expected_dirs = [
    "data/raw", "data/staging", "data/processed", "data/quality", "data/manifests",
    "src/ingestion", "src/validation", "src/preprocessing", "src/features",
    "src/models", "src/risk", "src/scenarios", "src/optimization", "src/api",
    "tests", "docs", "notebooks", "scripts"
]

expected_docs = [
    "project-scope.md", "architecture.md", "data-sources.md", "data-contracts.md",
    "data-audit.md", "data-gaps.md", "assumptions.md", "risk-register.md", "implementation-plan.md"
]

expected_files = [
    ".gitignore", "README.md", "requirements.txt", "environment.yml", ".env.example"
]

raw_datasets = {
    "DCOILBRENTEU.csv": "fc9e2e3064d8458c8f31180b6f3ec329284b3e6782994ffafda7f7c06db15218",
    "data_gpr_daily_recent.xls": "827d56d130e1265407c9c91fbe8116717f2f1447457c119bcf21e22830c18442",
    "data_gpr_export.xls": "6126ac6838929a4fd2e4c287979ed985f31f05fc92ab5784a55172b8bef993c2",
    "8d3b6596-b09e-4077-aebf-425193185a5b.csv": "2aca872a202c6802ee5f15cc82b4b0971f40c936a53162f7cab0b36ac217c5c6",
    "productconsumption.csv": "3d53ff10ec6036eae78245fc50d047712026dd2b1a610bb7e3469091916b34dd",
    "1777985064_PT_Consumption_English.xls": "d8da87f322342657a81227600d3448ff8b3efa0112cb7d38150d3bb0b991cae6",
    "1735553804_consumption_en.xlsx": "a763332687ebcd81cd54f93543fb4a5f07df3b65f121106891d1e78579a055f2",
    "1773140735_FY_24-25_consumption-en.xlsx": "6f8f08b7fe6e83d430b21e69881d4a43bcacc1787bbd0c5a5b24e9696874ad9f",
    "1783938756_PT Consumption.xlsx": "ac7f5d3ebc0ceee17e3bff8d2731a0728d7e4282fc5425bea3b04eb0caec0689",
    "1786022792_PT Consumption.xlsx": "1cfe45bc44ec2fc8d0e03cc5bf4a059c98fb9b3dfc6a563d3007b2ef5dd1c582",
    "1751964547_PT_IMPORT_TMT_H.xlsx": "772d7c9f54f6650960d0c3b1885575d638de478148374cba936c41cee457353b",
    "1751964598_PT_IMPORT_VAL_RS.CRS._H.xlsx": "c7f52e764c9b8c47542dd14776073d1b76fa6ea3ab1de3fbfdf18fd3f09a0e9a",
    "1751964622_PT_IMPORT_VAL_US$_H.xlsx": "fd2ebfb9a9c93e544c89c4008615062b6d6f76190170f758dd7b20bbad47064b",
    "1787119551_PT_import.xls": "6e81e61e674489d5d3ad460aa7db053f6909dd193b1756da06aa961e3623c041"
}

def calculate_sha256(filepath):
    h = hashlib.sha256()
    with open(filepath, 'rb') as f:
        while True:
            chunk = f.read(65536)
            if not chunk:
                break
            h.update(chunk)
    return h.hexdigest()

def run_verification():
    passed = True
    print("================================================================================")
    print("VERIFYING PLATFORM INITIALIZATION")
    print("================================================================================")
    
    # 1. Verify Directory Structures
    print("\n1. Checking directories...")
    for d in expected_dirs:
        dpath = os.path.join(BASE_DIR, d)
        if os.path.isdir(dpath):
            print(f"  [OK] Directory exists: {d}")
        else:
            print(f"  [FAIL] Directory missing: {d}")
            passed = False
            
    # 2. Verify Root Project Files
    print("\n2. Checking project files...")
    for f in expected_files:
        fpath = os.path.join(BASE_DIR, f)
        if os.path.isfile(fpath):
            print(f"  [OK] File exists: {f}")
        else:
            print(f"  [FAIL] File missing: {f}")
            passed = False
            
    # 3. Verify Documentation Files
    print("\n3. Checking documentation...")
    for doc in expected_docs:
        docpath = os.path.join(BASE_DIR, "docs", doc)
        if os.path.isfile(docpath):
            print(f"  [OK] Doc exists: docs/{doc}")
        else:
            print(f"  [FAIL] Doc missing: docs/{doc}")
            passed = False
            
    # 4. Verify Raw Datasets and Signatures
    print("\n4. Checking raw datasets & SHA256 hashes...")
    for fname, expected_hash in raw_datasets.items():
        fpath = os.path.join(BASE_DIR, "data/raw", fname)
        if os.path.isfile(fpath):
            actual_hash = calculate_sha256(fpath)
            if actual_hash == expected_hash:
                print(f"  [OK] Dataset {fname} present and hash matches.")
            else:
                print(f"  [FAIL] Dataset {fname} hash mismatch! Expected {expected_hash}, got {actual_hash}")
                passed = False
        else:
            print(f"  [FAIL] Dataset missing: {fname}")
            passed = False
            
    # 5. Verify Ingest Metadata Manifest
    print("\n5. Checking data manifest...")
    manifest_path = os.path.join(BASE_DIR, "data/manifests/data_manifest.json")
    if os.path.isfile(manifest_path):
        try:
            with open(manifest_path, 'r', encoding='utf-8') as mf:
                data = json.load(mf)
                print(f"  [OK] Manifest is valid JSON. Version: {data.get('manifest_version')}, Registered Datasets: {len(data.get('datasets', []))}")
        except Exception as e:
            print(f"  [FAIL] Manifest failed to parse: {e}")
            passed = False
    else:
        print("  [FAIL] Data manifest missing.")
        passed = False
        
    # 6. Verify Quality Reports
    print("\n6. Checking quality reports...")
    quality_dir = os.path.join(BASE_DIR, "data/quality")
    quality_files = [f for f in os.listdir(quality_dir) if f.endswith("_quality.json")]
    print(f"  [OK] Found {len(quality_files)} JSON quality reports under data/quality/.")
    if len(quality_files) < len(raw_datasets):
        print(f"  [FAIL] Expected at least {len(raw_datasets)} quality reports, but found {len(quality_files)}")
        passed = False
        
    print("\n================================================================================")
    if passed:
        print("VERIFICATION SUCCESSFUL: ALL CHECKS PASSED.")
    else:
        print("VERIFICATION FAILED: SOME CHECKS MISSED.")
    print("================================================================================")

if __name__ == "__main__":
    run_verification()
