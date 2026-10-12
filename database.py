"""SQLite persistence for country records."""

from __future__ import annotations

import sqlite3
from pathlib import Path
from typing import Any


PROJECT_DIR = Path(__file__).resolve().parent
DEFAULT_DATABASE_PATH = PROJECT_DIR / "countries.db"


class CountryDatabaseManager:
    """Manage country rows using the country name as the natural primary key."""

    def __init__(self, database_path: str | Path = DEFAULT_DATABASE_PATH) -> None:
        self.database_path = str(database_path)
        self._initialize_schema()

    def _connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self.database_path)
        connection.row_factory = sqlite3.Row
        return connection

    def _initialize_schema(self) -> None:
        with self._connect() as connection:
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS countries (
                    country_name TEXT PRIMARY KEY,
                    capital TEXT NOT NULL,
                    population INTEGER NOT NULL CHECK (population >= 0),
                    area REAL NOT NULL CHECK (area >= 0)
                )
                """
            )

    @staticmethod
    def _as_dict(row: sqlite3.Row | None) -> dict[str, Any] | None:
        return dict(row) if row is not None else None

    def create_country(
        self, country_name: str, capital: str, population: int, area: float
    ) -> dict[str, Any]:
        with self._connect() as connection:
            connection.execute(
                "INSERT INTO countries (country_name, capital, population, area) VALUES (?, ?, ?, ?)",
                (country_name, capital, population, area),
            )
            row = connection.execute(
                "SELECT * FROM countries WHERE country_name = ?", (country_name,)
            ).fetchone()
        return dict(row)

    def upsert_country(
        self, country_name: str, capital: str, population: int, area: float
    ) -> dict[str, Any]:
        """Insert a scraped row or refresh its values on a later scrape."""
        with self._connect() as connection:
            connection.execute(
                """
                INSERT INTO countries (country_name, capital, population, area)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(country_name) DO UPDATE SET
                    capital = excluded.capital,
                    population = excluded.population,
                    area = excluded.area
                """,
                (country_name, capital, population, area),
            )
            row = connection.execute(
                "SELECT * FROM countries WHERE country_name = ?", (country_name,)
            ).fetchone()
        return dict(row)

    def get_all_countries(self) -> list[dict[str, Any]]:
        with self._connect() as connection:
            rows = connection.execute(
                "SELECT * FROM countries ORDER BY rowid"
            ).fetchall()
        return [dict(row) for row in rows]

    def get_country(self, country_name: str) -> dict[str, Any] | None:
        with self._connect() as connection:
            row = connection.execute(
                "SELECT * FROM countries WHERE country_name = ?", (country_name,)
            ).fetchone()
        return self._as_dict(row)

    def update_country(self, country_name: str, **fields: Any) -> dict[str, Any] | None:
        allowed = {"capital", "population", "area"}
        updates = {key: value for key, value in fields.items() if key in allowed and value is not None}
        if not updates:
            return self.get_country(country_name)

        assignments = ", ".join(f"{column} = ?" for column in updates)
        values = [*updates.values(), country_name]
        with self._connect() as connection:
            cursor = connection.execute(
                f"UPDATE countries SET {assignments} WHERE country_name = ?", values
            )
            if cursor.rowcount == 0:
                return None
            row = connection.execute(
                "SELECT * FROM countries WHERE country_name = ?", (country_name,)
            ).fetchone()
        return self._as_dict(row)

    def delete_country(self, country_name: str) -> bool:
        with self._connect() as connection:
            cursor = connection.execute(
                "DELETE FROM countries WHERE country_name = ?", (country_name,)
            )
        return cursor.rowcount > 0
