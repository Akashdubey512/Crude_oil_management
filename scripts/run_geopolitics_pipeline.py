import sys
import argparse
import os

# Ensure the root of the project is in the search path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.geopolitics.geopolitical_pipeline import run_geopolitical_pipeline

def main():
    parser = argparse.ArgumentParser(description="Energy Supply Chain Geopolitical Risk Pipeline")
    parser.add_argument(
        "--cached", 
        action="store_true", 
        help="Use cached raw GDELT and OFAC files instead of querying live APIs."
    )
    
    args = parser.parse_args()
    
    # Run the pipeline (force_live is True unless --cached is specified)
    force_live = not args.cached
    
    print(f"Executing Geopolitical Risk Layer (force_live={force_live})...")
    run_geopolitical_pipeline(force_live=force_live)
    print("Geopolitical Risk Layer executed successfully.")

if __name__ == "__main__":
    main()
