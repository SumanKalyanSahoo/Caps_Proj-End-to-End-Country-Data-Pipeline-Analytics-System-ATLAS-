"""Fetch API data, export a CSV, and create a population-versus-area plot."""

from __future__ import annotations

import os
from pathlib import Path

PROJECT_DIR = Path(__file__).resolve().parent
os.environ.setdefault("MPLCONFIGDIR", str(PROJECT_DIR / ".matplotlib"))

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import pandas as pd
import requests


API_BASE_URL = "http://127.0.0.1:8000"
CSV_PATH = PROJECT_DIR / "exported_countries.csv"
PLOT_PATH = PROJECT_DIR / "population_vs_area.png"


def fetch_countries(api_base_url: str = API_BASE_URL) -> list[dict]:
    response = requests.get(f"{api_base_url.rstrip('/')}/countries", timeout=30)
    response.raise_for_status()
    return response.json()


def main() -> None:
    countries = fetch_countries()
    if not countries:
        raise SystemExit("The API returned no countries. Run scraper.py first.")

    frame = pd.DataFrame(countries)
    frame = frame[["country_name", "capital", "population", "area"]]
    print(frame.to_string(index=False))
    frame.to_csv(CSV_PATH, index=False, encoding="utf-8")

    figure, axis = plt.subplots(figsize=(10, 6))
    axis.scatter(frame["population"], frame["area"], alpha=0.8)
    axis.set_title("Country Population vs. Area")
    axis.set_xlabel("Population")
    axis.set_ylabel("Area (sq. km)")
    axis.grid(True, linestyle="--", alpha=0.5)
    figure.tight_layout()
    figure.savefig(PLOT_PATH, dpi=150)
    plt.close(figure)

    print(f"CSV saved to {CSV_PATH}")
    print(f"Scatter plot saved to {PLOT_PATH}")


if __name__ == "__main__":
    main()
