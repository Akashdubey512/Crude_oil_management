import sys
import os

# Ensure project root is in path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.features.feature_pipeline import run_feature_pipeline

def main():
    print("Running feature engineering pipeline...")
    run_feature_pipeline()
    print("Feature engineering pipeline completed successfully.")

if __name__ == "__main__":
    main()
