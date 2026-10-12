(() => {
  const number = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);

  function renderCountryChart(countries) {
    const svg = document.querySelector("#country-chart");
    const caption = document.querySelector("#chart-caption");
    const width = 900;
    const height = 310;
    const margin = { top: 15, right: 20, bottom: 48, left: 72 };
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;
    if (!countries.length) {
      svg.innerHTML = `<text class="chart-tick" x="450" y="145" text-anchor="middle">No countries to plot</text>`;
      caption.textContent = "0 countries shown";
      return;
    }

    const populations = countries.map((item) => Number(item.population));
    const areas = countries.map((item) => Number(item.area));
    const positivePopulations = populations.filter((value) => value > 0);
    const positiveAreas = areas.filter((value) => value > 0);
    const xMin = Math.floor(Math.log10(positivePopulations.length ? Math.min(...positivePopulations) : 1));
    const xMax = Math.max(xMin + 1, Math.ceil(Math.log10(Math.max(...positivePopulations, 1))));
    const yMin = Math.floor(Math.log10(positiveAreas.length ? Math.min(...positiveAreas) : 1));
    const yMax = Math.max(yMin + 1, Math.ceil(Math.log10(Math.max(...positiveAreas, 1))));
    const x = (value) => Number(value) <= 0 ? margin.left : margin.left + ((Math.log10(Number(value)) - xMin) / (xMax - xMin)) * plotWidth;
    const y = (value) => Number(value) <= 0 ? margin.top + plotHeight : margin.top + plotHeight - ((Math.log10(Number(value)) - yMin) / (yMax - yMin)) * plotHeight;
    const label = (power) => {
      const value = 10 ** power;
      if (value >= 1e9) return `${value / 1e9}B`;
      if (value >= 1e6) return `${value / 1e6}M`;
      if (value >= 1e3) return `${value / 1e3}K`;
      return number.format(value);
    };
    const xTicks = Array.from({ length: xMax - xMin + 1 }, (_, i) => xMin + i);
    const yTicks = Array.from({ length: yMax - yMin + 1 }, (_, i) => yMin + i);
    const horizontal = yTicks.map((tick) => {
      const py = y(10 ** tick);
      return `<line class="chart-grid" x1="${margin.left}" y1="${py}" x2="${width - margin.right}" y2="${py}"/><text class="chart-tick" x="${margin.left - 11}" y="${py + 3}" text-anchor="end">${label(tick)}</text>`;
    }).join("");
    const vertical = xTicks.map((tick) => {
      const px = x(10 ** tick);
      return `<line class="chart-grid" x1="${px}" y1="${margin.top}" x2="${px}" y2="${margin.top + plotHeight}"/><text class="chart-tick" x="${px}" y="${margin.top + plotHeight + 18}" text-anchor="middle">${label(tick)}</text>`;
    }).join("");
    const points = countries.map((country) => {
      const px = x(country.population);
      const py = y(country.area);
      const title = `${escapeHtml(country.country_name)} · Population ${number.format(country.population)} · Area ${number.format(country.area)} km²`;
      return `<circle class="chart-point" cx="${px}" cy="${py}" r="4.5" tabindex="0"><title>${title}</title></circle>`;
    }).join("");

    svg.innerHTML = `<g>${horizontal}${vertical}</g>
      <line class="chart-axis" x1="${margin.left}" y1="${margin.top + plotHeight}" x2="${width - margin.right}" y2="${margin.top + plotHeight}"/>
      <line class="chart-axis" x1="${margin.left}" y1="${margin.top}" x2="${margin.left}" y2="${margin.top + plotHeight}"/>
      ${points}
      <text class="chart-axis-label" x="${margin.left + plotWidth / 2}" y="${height - 5}" text-anchor="middle">Population</text>
      <text class="chart-axis-label" transform="translate(16 ${margin.top + plotHeight / 2}) rotate(-90)" text-anchor="middle">Land area (km²)</text>`;
    caption.textContent = `${countries.length} ${countries.length === 1 ? "country" : "countries"} shown`;
  }

  window.renderCountryChart = renderCountryChart;
})();
