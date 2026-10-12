# ATLAS Country Data Pipeline

A small end-to-end pipeline for the first 20 country records on [Scrape This Site](https://www.scrapethissite.com/pages/simple/).

## Setup

```bash
python3 -m venv .venv
source .venv/bin/activate       # Windows: .venv\Scripts\activate
python -m pip install -r requirements.txt
```

## Run the pipeline

From the project root, scrape and store the first 20 countries in SQLite:

```bash
python scraper.py
```

Start the API in a second terminal:

```bash
uvicorn api:app --reload
```

Then run the client in another terminal:

```bash
python client.py
```

The client prints the data, writes `exported_countries.csv`, and saves `population_vs_area.png` in the project root. The database file is `countries.db`.

## API

The ATLAS browser dashboard is served at `http://127.0.0.1:8000/`; it supports searching, adding, editing, and deleting countries, and includes a population-versus-area scatter plot. The chart uses logarithmic axes so small and large values remain visible, and follows the current search filter. The interactive API reference remains at `/docs`.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/countries` | List all stored countries |
| GET | `/countries/{country_name}` | Get one country by its name |
| POST | `/countries` | Create a country |
| PUT | `/countries/{country_name}` | Update a country's capital, population, or area |
| DELETE | `/countries/{country_name}` | Delete a country |

Country names in path parameters are URL-decoded by FastAPI. When calling the API directly, URL-encode spaces and other reserved characters.

## Project files

- `scraper.py`: fetches and parses the source page, taking only its first 20 country cards.
- `database.py`: SQLite schema and `CountryDatabaseManager` CRUD methods.
- `api.py`: FastAPI application and REST routes.
- `client.py`: API client, DataFrame display, CSV export, and scatter plot.
- `static/`: ATLAS logo, globe artwork, dashboard layout, styles, and chart code.
