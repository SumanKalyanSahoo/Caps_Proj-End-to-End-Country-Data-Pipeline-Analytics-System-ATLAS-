"""Scrape the first 20 country cards and save them in the local database."""

from __future__ import annotations

import re

import requests
from bs4 import BeautifulSoup

from database import CountryDatabaseManager


SOURCE_URL = "https://www.scrapethissite.com/pages/simple/"
COUNTRY_LIMIT = 20


def scrape_countries(limit: int = COUNTRY_LIMIT) -> list[dict[str, str | int | float]]:
    response = requests.get(
        SOURCE_URL,
        timeout=30,
        headers={"User-Agent": "CountryDataCapstone/1.0 (educational project)"},
    )
    response.raise_for_status()
    soup = BeautifulSoup(response.text, "html.parser")
    cards = soup.select(".country")[:limit]
    if not cards:
        raise RuntimeError("No country records found; the source page structure may have changed.")

    countries: list[dict[str, str | int | float]] = []
    for card in cards:
        name_node = card.select_one(".country-name")
        capital_node = card.select_one(".country-capital")
        population_node = card.select_one(".country-population")
        area_node = card.select_one(".country-area")
        if not all((name_node, capital_node, population_node, area_node)):
            continue

        population_text = re.sub(r"[^\d]", "", population_node.get_text(" ", strip=True))
        area_text = re.sub(r"[^\d.eE+-]", "", area_node.get_text(" ", strip=True))
        countries.append(
            {
                "country_name": name_node.get_text(" ", strip=True),
                "capital": capital_node.get_text(" ", strip=True),
                "population": int(population_text),
                "area": float(area_text),
            }
        )

    if len(countries) != min(limit, len(cards)):
        raise RuntimeError(
            f"Parsed {len(countries)} of {len(cards)} requested country cards; "
            "the source page structure may have changed."
        )
    return countries


def main() -> None:
    countries = scrape_countries()
    database = CountryDatabaseManager()
    for country in countries:
        database.upsert_country(**country)
    print(f"Scraped and saved {len(countries)} countries to {database.database_path}")


if __name__ == "__main__":
    main()
