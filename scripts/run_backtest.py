import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.models.backtest import run_backtest

def main():
    print("Running historical backtesting simulation...")
    run_backtest()
    print("Backtesting simulation completed successfully.")

if __name__ == "__main__":
    main()
