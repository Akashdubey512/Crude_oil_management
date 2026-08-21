import sys
import argparse
import os

# Ensure the root of the project is in the search path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.maritime.maritime_pipeline import run_maritime_pipeline

def main():
    parser = argparse.ArgumentParser(description="Energy Supply Chain Maritime & Corridor Ingestion Pipeline")
    parser.add_argument(
        "--cached", 
        action="store_true", 
        help="Use cached IMF PortWatch and GFW responses instead of querying live APIs."
    )
    
    args = parser.parse_args()
    force_live = not args.cached
    
    print(f"Executing Maritime Intelligence Layer (force_live={force_live})...")
    run_maritime_pipeline(force_live=force_live)
    print("Maritime Intelligence Layer executed successfully.")

if __name__ == "__main__":
    main()
