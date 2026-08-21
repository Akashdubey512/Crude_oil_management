import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.models.train_risk_models import train_all_models
from src.models.evaluate_models import write_comparison_report
from src.models.explainability import explain_all_models

def main():
    print("Training risk models...")
    all_results = train_all_models()
    
    print("\nGenerating model comparison reports...")
    write_comparison_report(all_results)
    
    print("\nGenerating explainability profiles...")
    explain_all_models()
    
    print("\nTraining and evaluation completed successfully.")

if __name__ == "__main__":
    main()
