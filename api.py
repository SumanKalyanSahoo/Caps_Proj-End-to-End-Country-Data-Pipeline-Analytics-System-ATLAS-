"""FastAPI service for country records."""

from __future__ import annotations

import sqlite3
from typing import Annotated, Optional
from pathlib import Path

from fastapi import FastAPI, HTTPException, Path as ApiPath
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, ConfigDict, Field

from database import CountryDatabaseManager


app = FastAPI(title="Country Data API", version="1.0.0")
database = CountryDatabaseManager()
STATIC_DIR = Path(__file__).resolve().parent / "static"
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


@app.get("/", include_in_schema=False)
def dashboard() -> FileResponse:
    return FileResponse(STATIC_DIR / "index.html")


class CountryCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    country_name: str = Field(min_length=1)
    capital: str
    population: int = Field(ge=0)
    area: float = Field(ge=0)


class CountryUpdate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    capital: Optional[str] = None
    population: Optional[int] = Field(default=None, ge=0)
    area: Optional[float] = Field(default=None, ge=0)


CountryName = Annotated[str, ApiPath(min_length=1, description="Exact country name")]


@app.get("/countries")
def list_countries() -> list[dict]:
    return database.get_all_countries()


@app.get("/countries/{country_name}")
def get_country(country_name: CountryName) -> dict:
    country = database.get_country(country_name)
    if country is None:
        raise HTTPException(status_code=404, detail="Country not found")
    return country


@app.post("/countries", status_code=201)
def create_country(payload: CountryCreate) -> dict:
    try:
        return database.create_country(**payload.model_dump())
    except sqlite3.IntegrityError as exc:
        raise HTTPException(status_code=409, detail="Country already exists") from exc


@app.put("/countries/{country_name}")
def update_country(country_name: CountryName, payload: CountryUpdate) -> dict:
    country = database.update_country(country_name, **payload.model_dump(exclude_unset=True))
    if country is None:
        raise HTTPException(status_code=404, detail="Country not found")
    return country


@app.delete("/countries/{country_name}", status_code=204)
def delete_country(country_name: CountryName) -> None:
    if not database.delete_country(country_name):
        raise HTTPException(status_code=404, detail="Country not found")
