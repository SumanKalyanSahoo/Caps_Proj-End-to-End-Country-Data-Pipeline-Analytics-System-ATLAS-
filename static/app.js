const API = "";
const state = { countries: [], editingName: null, toastTimer: null };
const rows = document.querySelector("#country-rows");
const search = document.querySelector("#search");
const dialog = document.querySelector("#country-dialog");
const form = document.querySelector("#country-form");
const fields = {
  country_name: document.querySelector("#country-name"),
  capital: document.querySelector("#capital"),
  population: document.querySelector("#population"),
  area: document.querySelector("#area"),
};

const number = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });
const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });
const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);

async function request(path, options = {}) {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
  });
  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const body = await response.json();
      message = body.detail || message;
    } catch (_) {}
    throw new Error(message);
  }
  return response.status === 204 ? null : response.json();
}

function renderSummary(countries) {
  const totalPopulation = countries.reduce((sum, item) => sum + Number(item.population), 0);
  const totalArea = countries.reduce((sum, item) => sum + Number(item.area), 0);
  document.querySelector("#total-countries").textContent = number.format(countries.length);
  document.querySelector("#total-population").textContent = compact.format(totalPopulation);
  document.querySelector("#total-area").textContent = compact.format(totalArea);
  document.querySelector("#last-refreshed").textContent = new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(new Date());
  document.querySelector("#side-count").textContent = countries.length;
}

function renderRows() {
  const query = search.value.trim().toLocaleLowerCase();
  const filtered = state.countries.filter((country) =>
    `${country.country_name} ${country.capital}`.toLocaleLowerCase().includes(query)
  );
  window.renderCountryChart(filtered);
  document.querySelector("#result-label").textContent = `Showing ${filtered.length} of ${state.countries.length} countries`;
  document.querySelector("#footer-count").textContent = `${filtered.length} ${filtered.length === 1 ? "record" : "records"}`;

  if (!filtered.length) {
    rows.innerHTML = `<tr><td colspan="5"><div class="empty-state"><strong>${state.countries.length ? "No matching countries" : "Your directory is empty"}</strong><span>${state.countries.length ? "Try a different name or capital." : "Add a country to start your collection."}</span></div></td></tr>`;
    return;
  }

  rows.innerHTML = filtered.map((country) => {
    const initial = escapeHtml(country.country_name.trim().charAt(0).toUpperCase());
    const key = encodeURIComponent(country.country_name);
    return `<tr>
      <td><div class="country-cell"><span class="country-avatar">${initial}</span>${escapeHtml(country.country_name)}</div></td>
      <td class="capital-cell">${escapeHtml(country.capital || "—")}</td>
      <td class="number-cell">${number.format(country.population)}</td>
      <td class="area-cell">${number.format(country.area)}</td>
      <td><div class="row-actions"><button class="row-action" data-action="edit" data-key="${key}" title="Edit ${escapeHtml(country.country_name)}" aria-label="Edit ${escapeHtml(country.country_name)}">✎</button><button class="row-action delete" data-action="delete" data-key="${key}" title="Delete ${escapeHtml(country.country_name)}" aria-label="Delete ${escapeHtml(country.country_name)}">⌫</button></div></td>
    </tr>`;
  }).join("");
}

async function loadCountries() {
  rows.innerHTML = '<tr><td colspan="5"><div class="loading"><span class="spinner"></span>Loading country records…</div></td></tr>';
  try {
    state.countries = await request("/countries");
    renderSummary(state.countries);
    renderRows();
  } catch (error) {
    rows.innerHTML = `<tr><td colspan="5"><div class="empty-state"><strong>Could not load the directory</strong><span>${escapeHtml(error.message)}. Refresh to try again.</span></div></td></tr>`;
    document.querySelector("#result-label").textContent = "API unavailable";
    showToast("Could not connect to the country API.");
  }
}

function openDialog(country = null) {
  state.editingName = country?.country_name ?? null;
  document.querySelector("#dialog-title").textContent = country ? "Edit country" : "Add a country";
  document.querySelector("#dialog-copy").textContent = country ? `Update the details for ${country.country_name}.` : "Add a new entry to your directory.";
  document.querySelector("#save-country").textContent = country ? "Save changes" : "Save country";
  fields.country_name.disabled = Boolean(country);
  for (const key of Object.keys(fields)) fields[key].value = country ? country[key] : "";
  document.querySelector("#dialog-error").textContent = "";
  dialog.showModal();
  (country ? fields.capital : fields.country_name).focus();
}

function closeDialog() {
  dialog.close();
  form.reset();
  fields.country_name.disabled = false;
  state.editingName = null;
}

function showToast(message) {
  const toast = document.querySelector("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(state.toastTimer);
  state.toastTimer = setTimeout(() => toast.classList.remove("show"), 2800);
}

document.querySelector("#add-country").addEventListener("click", () => openDialog());
document.querySelector("#close-dialog").addEventListener("click", closeDialog);
document.querySelector("#cancel-dialog").addEventListener("click", closeDialog);
document.querySelector("#refresh-data").addEventListener("click", loadCountries);
search.addEventListener("input", renderRows);
document.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    search.focus();
  }
});

rows.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const countryName = decodeURIComponent(button.dataset.key);
  const country = state.countries.find((item) => item.country_name === countryName);
  if (!country) return;
  if (button.dataset.action === "edit") {
    openDialog(country);
    return;
  }
  if (!window.confirm(`Delete ${countryName} from the directory?`)) return;
  try {
    await request(`/countries/${encodeURIComponent(countryName)}`, { method: "DELETE" });
    showToast(`${countryName} deleted.`);
    await loadCountries();
  } catch (error) {
    showToast(error.message);
  }
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const payload = {
    country_name: fields.country_name.value.trim(),
    capital: fields.capital.value.trim(),
    population: Number(fields.population.value),
    area: Number(fields.area.value),
  };
  const editing = Boolean(state.editingName);
  const endpoint = editing ? `/countries/${encodeURIComponent(state.editingName)}` : "/countries";
  const button = document.querySelector("#save-country");
  button.disabled = true;
  button.textContent = "Saving…";
  document.querySelector("#dialog-error").textContent = "";
  try {
    await request(endpoint, { method: editing ? "PUT" : "POST", body: JSON.stringify(editing ? { capital: payload.capital, population: payload.population, area: payload.area } : payload) });
    closeDialog();
    showToast(editing ? "Country changes saved." : "Country added to the directory.");
    await loadCountries();
  } catch (error) {
    document.querySelector("#dialog-error").textContent = error.message;
  } finally {
    button.disabled = false;
    button.textContent = editing ? "Save changes" : "Save country";
  }
});

loadCountries();
