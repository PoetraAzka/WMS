(function () {
  "use strict";

  const ROOT_ID = "dashboard-analytics";
  const SERIES = [
    { key: "receiving", label: "Receiving", color: "#2563eb" },
    { key: "issue", label: "Issue", color: "#dc6b35" },
    { key: "return", label: "Return", color: "#15966a" },
    { key: "transfer", label: "Transfer", color: "#8b5cf6" },
    { key: "adjustment", label: "Adjustment", color: "#c08b20" }
  ];

  let requestId = 0;

  function number(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function format(value) {
    return number(value).toLocaleString("id-ID", { maximumFractionDigits: 2 });
  }

  function create(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function showMessage(root, message, isError) {
    const status = root.querySelector("[data-analytics-message]");
    if (!status) return;
    status.textContent = message || "";
    status.classList.toggle("is-error", Boolean(isError));
    status.classList.toggle("is-visible", Boolean(message));
  }

  function renderTrend(root, rows) {
    const chart = root.querySelector("[data-trend-chart]");
    const legend = root.querySelector("[data-trend-legend]");
    chart.replaceChildren();
    legend.replaceChildren();

    if (!rows.length) {
      chart.appendChild(create("div", "da-empty", "Belum ada data transaksi pada periode ini."));
      return;
    }

    const width = 760;
    const height = 260;
    const pad = { top: 18, right: 18, bottom: 38, left: 42 };
    const plotW = width - pad.left - pad.right;
    const plotH = height - pad.top - pad.bottom;
    const maxValue = Math.max(1, ...rows.flatMap(row => SERIES.map(s => number(row[s.key]))));
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", "Grafik tren transaksi harian");

    for (let i = 0; i <= 4; i++) {
      const y = pad.top + (plotH * i / 4);
      const line = document.createElementNS(svg.namespaceURI, "line");
      line.setAttribute("x1", pad.left);
      line.setAttribute("x2", width - pad.right);
      line.setAttribute("y1", y);
      line.setAttribute("y2", y);
      line.setAttribute("class", "da-gridline");
      svg.appendChild(line);

      const label = document.createElementNS(svg.namespaceURI, "text");
      label.setAttribute("x", pad.left - 9);
      label.setAttribute("y", y + 4);
      label.setAttribute("text-anchor", "end");
      label.setAttribute("class", "da-axis-label");
      label.textContent = format(maxValue * (4 - i) / 4);
      svg.appendChild(label);
    }

    const labelCount = Math.min(6, rows.length);
    for (let i = 0; i < labelCount; i++) {
      const index = Math.round(i * (rows.length - 1) / Math.max(1, labelCount - 1));
      const x = pad.left + (rows.length === 1 ? plotW / 2 : index * plotW / (rows.length - 1));
      const label = document.createElementNS(svg.namespaceURI, "text");
      label.setAttribute("x", x);
      label.setAttribute("y", height - 10);
      label.setAttribute("text-anchor", "middle");
      label.setAttribute("class", "da-axis-label");
      label.textContent = String(rows[index].date || "").slice(5);
      svg.appendChild(label);
    }

    SERIES.forEach(series => {
      const points = rows.map((row, index) => {
        const x = pad.left + (rows.length === 1 ? plotW / 2 : index * plotW / (rows.length - 1));
        const y = pad.top + plotH - (number(row[series.key]) / maxValue) * plotH;
        return [x, y];
      });
      const polyline = document.createElementNS(svg.namespaceURI, "polyline");
      polyline.setAttribute("points", points.map(point => point.join(",")).join(" "));
      polyline.setAttribute("fill", "none");
      polyline.setAttribute("stroke", series.color);
      polyline.setAttribute("stroke-width", "2.6");
      polyline.setAttribute("stroke-linecap", "round");
      polyline.setAttribute("stroke-linejoin", "round");
      if (rows.length === 1) {
        const circle = document.createElementNS(svg.namespaceURI, "circle");
        circle.setAttribute("cx", points[0][0]);
        circle.setAttribute("cy", points[0][1]);
        circle.setAttribute("r", "4");
        circle.setAttribute("fill", series.color);
        svg.appendChild(circle);
      } else {
        svg.appendChild(polyline);
      }
    });

    chart.appendChild(svg);

    SERIES.forEach(series => {
      const item = create("span", "da-legend-item");
      const dot = create("i", "da-legend-dot");
      dot.style.backgroundColor = series.color;
      item.append(dot, document.createTextNode(series.label));
      legend.appendChild(item);
    });
  }

  function renderBars(container, rows, key, labels, emptyText) {
    container.replaceChildren();
    const values = rows.map(row => ({ label: labels[row.status] || row.status, value: number(row[key]), status: row.status }));
    const max = Math.max(1, ...values.map(item => item.value));

    if (!values.length) {
      container.appendChild(create("div", "da-empty", emptyText));
      return;
    }

    values.forEach(item => {
      const row = create("div", "da-bar-row");
      const top = create("div", "da-bar-top");
      top.append(create("span", "da-bar-label", item.label), create("strong", "da-bar-value", format(item.value)));
      const track = create("div", "da-bar-track");
      const fill = create("div", "da-bar-fill");
      fill.style.width = (item.value / max * 100) + "%";
      fill.className += " status-" + String(item.status).toLowerCase();
      track.appendChild(fill);
      row.append(top, track);
      container.appendChild(row);
    });
  }

  function renderData(root, data) {
    const trend = Array.isArray(data.transactionTrend) ? data.transactionTrend : [];
    const stock = Array.isArray(data.stockStatus) ? data.stockStatus : [];
    const units = Array.isArray(data.unitStatus) ? data.unitStatus : [];

    renderTrend(root, trend);
    renderBars(root.querySelector("[data-stock-chart]"), stock, "quantity", {
      AVAILABLE: "Available",
      RESERVED: "Reserved",
      QUARANTINE: "Quarantine",
      IN_TRANSIT: "In Transit"
    }, "Belum ada saldo inventory.");

    renderBars(root.querySelector("[data-unit-chart]"), units, "units", {
      IN_STOCK: "In Stock",
      ASSIGNED: "Assigned",
      IN_REPAIR: "In Repair",
      LOST: "Lost",
      DISPOSED: "Disposed"
    }, "Belum ada unit terdaftar.");

    const totalTransactions = trend.reduce((sum, row) => sum + number(row.total), 0);
    const totalStock = stock.reduce((sum, row) => sum + number(row.quantity), 0);
    const totalUnits = units.reduce((sum, row) => sum + number(row.units), 0);
    root.querySelector("[data-total-transactions]").textContent = format(totalTransactions);
    root.querySelector("[data-total-stock]").textContent = format(totalStock);
    root.querySelector("[data-total-units]").textContent = format(totalUnits);

    const generated = data.generatedAt ? new Date(data.generatedAt) : new Date();
    root.querySelector("[data-analytics-updated]").textContent =
      "Data diperbarui " + (Number.isNaN(generated.getTime()) ? "baru saja" :
        generated.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }));
  }

  async function load(root) {
    const client = window.WMS_AUTH && window.WMS_AUTH.client;
    if (!client) {
      showMessage(root, "Koneksi Supabase belum tersedia.", true);
      return;
    }

    const days = number(root.querySelector("[data-period]").value) || 30;
    const currentRequest = ++requestId;
    const button = root.querySelector("[data-analytics-refresh]");
    button.disabled = true;
    button.textContent = "Memuat...";
    showMessage(root, "Mengambil data analitik...", false);

    try {
      const { data, error } = await client.rpc("wms_get_dashboard_analytics", { p_days: days });
      if (currentRequest !== requestId || !root.isConnected) return;
      if (error) throw error;
      if (!data || data.ok !== true) throw new Error("Respons analitik tidak valid.");

      renderData(root, data);
      showMessage(root, "", false);
      root.querySelector("[data-period-label]").textContent =
        "Periode " + data.fromDate + " sampai " + data.toDate;
    } catch (error) {
      if (currentRequest !== requestId || !root.isConnected) return;
      console.error("WMS Dashboard Analytics:", error);
      showMessage(root, error && error.message ? error.message : "Gagal memuat data analitik.", true);
    } finally {
      if (currentRequest === requestId && root.isConnected) {
        button.disabled = false;
        button.textContent = "↻ Refresh Analytics";
      }
    }
  }

  function initialize(root) {
    if (root.dataset.initialized === "true") return;
    root.dataset.initialized = "true";
    root.querySelector("[data-period]").addEventListener("change", () => load(root));
    root.querySelector("[data-analytics-refresh]").addEventListener("click", () => load(root));
    load(root);
  }

  function scan() {
    const root = document.getElementById(ROOT_ID);
    if (root) initialize(root);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scan, { once: true });
  } else {
    scan();
  }

  const observer = new MutationObserver(scan);
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
