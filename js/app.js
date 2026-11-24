
/***************************************************************
 * WMS - FRONTEND APPLICATION CONTROLLER
 * Version : 1.10.1
 *
 * Modules:
 * - Authentication
 * - Navigation
 * - Dashboard
 * - Master Data
 * - Placeholder Modules
 *
 * Note: Stock Opname / Individual Stock Count module removed.
 *
 * Dependencies:
 * - google.script.run
 * - Main.gs
 * - Auth.gs
 * - Dashboard.html
 * - MasterData.html
 * - MasterDataScript.html
 ***************************************************************/

(function () {

  "use strict";


  /* =========================================================
     01. APPLICATION STATE
  ========================================================= */

  let currentAdmin = null;

  let currentPage = "dashboard";

  let dashboardRequestId = 0;



  /* =========================================================
     02. PAGE DEFINITIONS
  ========================================================= */

  const pageDefinitions = {

    "master-data": {

      title: "Master Data",

      icon: "▤",

      description:
        "Kelola identitas barang, kategori, satuan, lokasi, dan person."

    },


    "inventory": {

      title: "Inventory Management",

      icon: "▣",

      description:
        "Monitor Stock On Hand, Available Stock, lokasi penyimpanan, dan histori stok."

    },


    "transactions": {

      title: "Inventory Transactions",

      icon: "⇄",

      description:
        "Kelola Receiving, Issuance, Return, Transfer, dan Stock Adjustment."

    },


    "assets": {

      title: "Asset Management",

      icon: "▧",

      description:
        "Kelola identitas unit, QR Code, asset movement, custodian, dan kondisi."

    },

    "reports": {

      title: "Reports",

      icon: "▥",

      description:
        "Lihat dan buat laporan inventory, asset, dan transaksi."

    },


    "settings": {

      title: "System Settings",

      icon: "⚙",

      description:
        "Pengaturan sistem, pengguna, konfigurasi, dan audit."

    }

  };


  /* =========================================================
     03. APPLICATION STARTUP
  ========================================================= */

  function initializeApplication() {

    console.info("WMS: Initializing application...");


    bindNavigation();


    requestWmsSession();

  }


  function requestWmsSession() {

    setAuthMessage(
      "Memverifikasi identitas Admin..."
    );


    // Verify backend bridge communication.
    if (
      typeof google === "undefined" ||
      !google.script ||
      !google.script.run
    ) {

      showAuthenticationError(
        "Koneksi backend WMS tidak tersedia."
      );

      return;

    }


    // Request authentication.
    google.script.run

      .withSuccessHandler(
        handleAuthentication
      )

      .withFailureHandler(
        handleAuthenticationError
      )

      .getWmsSessionInfo();

  }


  window.wmsRetrySessionCheck = requestWmsSession;


  // Support both normal and delayed script loading.
  if (document.readyState === "loading") {

    document.addEventListener(
      "DOMContentLoaded",
      initializeApplication,
      { once: true }
    );

  } else {

    initializeApplication();

  }


  /* =========================================================
     04. AUTHENTICATION
  ========================================================= */

  function handleAuthentication(result) {

    if (!result || !result.authorized) {

      if (result && result.needsLogin) {

        const el = document.getElementById("auth-message");
        if (el) {
          el.className = "auth-message";
          el.textContent = result.message || "Silakan login untuk mengakses WMS.";
        }
        return;

      }

      showAuthenticationError(
        result && result.message
          ? result.message
          : "Autentikasi tidak berhasil."
      );

      return;

    }


    currentAdmin = result;


    const authScreen = document.getElementById(
      "auth-screen"
    );

    const appShell = document.getElementById(
      "app-shell"
    );


    if (!authScreen || !appShell) {

      console.error(
        "WMS: Application container tidak ditemukan."
      );

      return;

    }


    // Show application.
    authScreen.classList.add("hidden");

    appShell.classList.remove("hidden");


    // Display administrator information.
    updateAdminInformation();


    console.info(
      "WMS: Authentication successful.",
      currentAdmin.email
    );


    // Navigate to dashboard.
    navigateTo("dashboard");

  }


  function handleAuthenticationError(error) {

    console.error(
      "WMS Authentication Error:",
      error
    );


    showAuthenticationError(
      error && error.message
        ? error.message
        : "Gagal menghubungkan ke backend WMS."
    );

  }


  function updateAdminInformation() {

    if (!currentAdmin) return;


    const nameElement = document.getElementById(
      "user-name"
    );

    const roleElement = document.getElementById(
      "user-role"
    );

    const avatarElement = document.getElementById(
      "user-avatar"
    );


    if (nameElement) {

      nameElement.textContent =
        currentAdmin.displayName || "Admin";

    }


    if (roleElement) {

      roleElement.textContent =
        currentAdmin.role || "ADMIN";

    }


    if (avatarElement) {

      const initials = String(
        currentAdmin.displayName || "A"
      )

        .trim()

        .split(/\s+/)

        .slice(0, 2)

        .map(function (word) {

          return word.charAt(0);

        })

        .join("")

        .toUpperCase();


      avatarElement.textContent =
        initials || "A";

    }

  }


  function setAuthMessage(message) {

    const element = document.getElementById(
      "auth-message"
    );


    if (element) {

      element.className = "auth-message";

      element.textContent = message;

    }

  }


  function showAuthenticationError(message) {

    const element = document.getElementById(
      "auth-message"
    );


    if (!element) return;


    element.className =
      "auth-message auth-error";

    element.textContent = message;

  }


  /* =========================================================
     05. NAVIGATION EVENT HANDLERS
  ========================================================= */

  function bindNavigation() {

    // Navigation buttons.
    document
      .querySelectorAll(".nav-item")
      .forEach(function (button) {

        button.addEventListener(
          "click",
          function () {

            const page = button.dataset.page;

            navigateTo(page);

            closeMobileSidebar();

          }
        );

      });


    // Sidebar toggle.
    const toggleButton = document.getElementById(
      "sidebar-toggle"
    );


    if (toggleButton) {

      toggleButton.addEventListener(
        "click",
        toggleMobileSidebar
      );

    }


    // Mobile overlay.
    const overlay = document.getElementById(
      "mobile-overlay"
    );


    if (overlay) {

      overlay.addEventListener(
        "click",
        closeMobileSidebar
      );

    }

  }


  /* =========================================================
     06. PAGE ROUTER
  ========================================================= */

  function navigateTo(page) {

    // Validate requested page.
    const isKnownPage =
      page === "dashboard" ||
      page === "master-data" ||
      Object.prototype.hasOwnProperty.call(
        pageDefinitions,
        page
      );


    if (!isKnownPage) {

      console.warn(
        "WMS: Unknown page requested:",
        page
      );

      page = "dashboard";

    }


    currentPage = page;


    // Update sidebar active state.
    updateActiveNavigation(page);


    // Dashboard.
    if (page === "dashboard") {

      renderDashboardPage();

      return;

    }


    // Master Data.
    if (page === "master-data") {

      renderMasterDataPage();

      return;

    }


    // Inventory Management.
    if (page === "inventory") {

      renderInventoryPage();

      return;

    }


    // Inventory Transactions.
    if (page === "transactions") {

      renderTransactionsPage();

      return;

    }


    // Asset Management.
    if (page === "assets") {

      renderAssetManagementPage();

      return;

    }



    // Other modules.
    renderPlaceholderPage(page);

  }


  function updateActiveNavigation(page) {

    document
      .querySelectorAll(".nav-item")
      .forEach(function (button) {

        button.classList.toggle(
          "active",
          button.dataset.page === page
        );

      });

  }


  /* =========================================================
     07. MOBILE SIDEBAR
  ========================================================= */

  function toggleMobileSidebar() {

    const shell = document.getElementById(
      "app-shell"
    );


    if (shell) {

      shell.classList.toggle(
        "sidebar-open"
      );

    }

  }


  function closeMobileSidebar() {

    const shell = document.getElementById(
      "app-shell"
    );


    if (shell) {

      shell.classList.remove(
        "sidebar-open"
      );

    }

  }


  /* =========================================================
     08. DASHBOARD PAGE
  ========================================================= */

  function renderDashboardPage() {

    const template = document.getElementById(
      "dashboard-template"
    );

    const content = document.getElementById(
      "page-content"
    );


    if (!template || !content) {

      renderModuleError(
        "Dashboard template tidak ditemukan."
      );

      return;

    }


    // Render dashboard template.
    const fragment =
      template.content.cloneNode(true);

    content.replaceChildren(fragment);


    // Refresh button.
    const refreshButton = document.getElementById(
      "refresh-dashboard"
    );


    if (refreshButton) {

      refreshButton.addEventListener(
        "click",
        loadDashboardData
      );

    }


    // Request dashboard data.
    loadDashboardData();

  }


  /* =========================================================
     09. DASHBOARD DATA REQUEST
  ========================================================= */

  function loadDashboardData() {

    if (currentPage !== "dashboard") {
      return;
    }


    const requestId = ++dashboardRequestId;


    const refreshButton = document.getElementById(
      "refresh-dashboard"
    );

    const updatedLabel = document.getElementById(
      "dashboard-updated"
    );

    const errorElement = document.getElementById(
      "dashboard-error"
    );


    if (refreshButton) {

      refreshButton.disabled = true;

      refreshButton.textContent =
        "Loading...";

    }


    if (updatedLabel) {

      updatedLabel.textContent =
        "Memuat data...";

    }


    if (errorElement) {

      errorElement.classList.add("hidden");

      errorElement.textContent = "";

    }


    google.script.run

      .withSuccessHandler(function (data) {

        // Ignore outdated responses.
        if (
          currentPage !== "dashboard" ||
          requestId !== dashboardRequestId
        ) {

          return;

        }


        if (refreshButton) {

          refreshButton.disabled = false;

          refreshButton.textContent =
            "↻ Refresh";

        }


        if (!data || !data.ok) {

          showDashboardError(
            "Respons dashboard tidak valid."
          );

          return;

        }


        renderDashboardData(data);

      })


      .withFailureHandler(function (error) {

        if (
          currentPage !== "dashboard" ||
          requestId !== dashboardRequestId
        ) {

          return;

        }


        if (refreshButton) {

          refreshButton.disabled = false;

          refreshButton.textContent =
            "↻ Refresh";

        }


        showDashboardError(
          error && error.message
            ? error.message
            : "Gagal membaca data dashboard."
        );

      })


      .getWmsDashboardData();

  }


  /* =========================================================
     10. DASHBOARD DATA RENDERING
  ========================================================= */

  function renderDashboardData(data) {

    const metrics = data.metrics || {};


    setMetric(
      "metric-total-items",
      metrics.totalItems
    );


    setMetric(
      "metric-tracked-units",
      metrics.trackedUnits
    );


    setMetric(
      "metric-low-stock",
      metrics.lowStockItems
    );


    setMetric(
      "metric-assigned-units",
      metrics.assignedUnits
    );


    renderRecentTransactions(
      Array.isArray(data.recentTransactions)
        ? data.recentTransactions
        : []
    );


    renderLowStock(
      Array.isArray(data.lowStockPreview)
        ? data.lowStockPreview
        : [],
      metrics.totalItems || 0
    );


    updateDashboardTimestamp(
      data.generatedAt
    );

  }


  function setMetric(elementId, value) {

    const element = document.getElementById(
      elementId
    );


    if (!element) return;


    const number = Number(value || 0);


    element.textContent =
      (
        Number.isFinite(number)
          ? number
          : 0
      ).toLocaleString("id-ID");

  }


  function updateDashboardTimestamp(timestamp) {

    const element = document.getElementById(
      "dashboard-updated"
    );


    if (!element) return;


    const date = timestamp
      ? new Date(timestamp)
      : new Date();


    if (Number.isNaN(date.getTime())) {

      element.textContent =
        "Updated just now";

      return;

    }


    element.textContent =
      "Updated " +
      date.toLocaleTimeString(
        "id-ID",
        {
          hour: "2-digit",
          minute: "2-digit"
        }
      );

  }


  /* =========================================================
     11. RECENT TRANSACTIONS
  ========================================================= */

  function renderRecentTransactions(transactions) {

    const body = document.getElementById(
      "recent-transactions-body"
    );


    if (!body) return;


    body.replaceChildren();


    if (transactions.length === 0) {

      const row = document.createElement("tr");

      const cell = document.createElement("td");


      cell.colSpan = 5;

      cell.className = "empty-state";

      cell.textContent =
        "Belum ada transaksi.";


      row.appendChild(cell);

      body.appendChild(row);

      return;

    }


    transactions.forEach(function (transaction) {

      const row = document.createElement("tr");


      appendTextCell(
        row,
        transaction.transactionNo
      );


      appendTextCell(
        row,
        transaction.type
      );


      appendTextCell(
        row,
        transaction.date
      );


      // Status badge.
      const statusCell = document.createElement("td");

      const badge = document.createElement("span");


      const status = String(
        transaction.status || "-"
      ).toUpperCase();


      badge.className =
        "status-badge " +
        getStatusClass(status);

      badge.textContent = status;


      statusCell.appendChild(badge);

      row.appendChild(statusCell);


      appendTextCell(
        row,
        transaction.createdBy
      );


      body.appendChild(row);

    });

  }


  function appendTextCell(row, value) {

    const cell = document.createElement("td");


    cell.textContent =
      value === null || value === undefined || value === ""
        ? "-"
        : String(value);


    row.appendChild(cell);

  }


  function getStatusClass(status) {

    if (status === "POSTED") {

      return "status-posted";

    }


    if (
      status === "DRAFT" ||
      status === "IN_TRANSIT" ||
      status === "POSTING"
    ) {

      return "status-draft";

    }


    if (
      status === "ERROR" ||
      status === "VOID" ||
      status === "REVERSED" ||
      status === "CANCELLED"
    ) {

      return "status-error";

    }


    return "";

  }


  /* =========================================================
     12. LOW STOCK ALERT
  ========================================================= */

  function renderLowStock(items, totalItems) {

    const container = document.getElementById(
      "low-stock-list"
    );


    if (!container) return;


    container.replaceChildren();


    if (items.length === 0) {

      const empty = document.createElement("div");


      empty.className = "empty-state";


      empty.textContent =
        Number(totalItems) === 0
          ? "Belum ada master item."
          : "Tidak ada item di bawah minimum stock.";


      container.appendChild(empty);

      return;

    }


    items.forEach(function (item) {

      const wrapper = document.createElement("div");

      wrapper.className = "stock-alert-item";


      const name = document.createElement("div");

      name.className = "stock-alert-name";

      name.textContent =
        item.itemName || "-";


      const code = document.createElement("div");

      code.className = "stock-alert-code";

      code.textContent =
        item.itemCode || "-";


      const quantity = document.createElement("div");

      quantity.className = "stock-alert-quantity";


      const available = Number(
        item.availableQty || 0
      );

      const minimum = Number(
        item.minimumStock || 0
      );


      quantity.textContent =
        "Available: " +
        available.toLocaleString("id-ID") +
        " | Minimum: " +
        minimum.toLocaleString("id-ID");


      wrapper.appendChild(name);

      wrapper.appendChild(code);

      wrapper.appendChild(quantity);


      container.appendChild(wrapper);

    });

  }


  /* =========================================================
     13. DASHBOARD ERROR
  ========================================================= */

  function showDashboardError(message) {

    const errorElement = document.getElementById(
      "dashboard-error"
    );


    if (!errorElement) {

      console.error(
        "WMS Dashboard:",
        message
      );

      return;

    }


    errorElement.textContent = message;

    errorElement.classList.remove("hidden");

  }


  /* =========================================================
     14. MASTER DATA PAGE
  ========================================================= */

  function renderMasterDataPage() {

    const template = document.getElementById(
      "master-data-template"
    );

    const content = document.getElementById(
      "page-content"
    );


    // Check template.
    if (!template || !content) {

      console.error(
        "WMS: Master Data template tidak ditemukan."
      );


      renderModuleError(
        "Master Data template tidak ditemukan. " +
        "Periksa include_('MasterData') pada Index.html."
      );

      return;

    }


    // Render Master Data page.
    const fragment =
      template.content.cloneNode(true);


    content.replaceChildren(fragment);


    // Check Master Data controller.
    if (
      typeof window.initWmsMasterDataPage !== "function"
    ) {

      console.error(
        "WMS: MasterDataScript tidak tersedia."
      );


      renderModuleError(
        "MasterDataScript tidak berhasil dimuat. " +
        "Periksa include_('MasterDataScript') pada Index.html."
      );

      return;

    }


    // Initialize Master Data.
    try {

      window.initWmsMasterDataPage();

      console.info(
        "WMS: Master Data initialized."
      );

    } catch (error) {

      console.error(
        "WMS Master Data initialization error:",
        error
      );


      renderModuleError(
        "Gagal menginisialisasi Master Data: " +
        error.message
      );

    }

  }



  /* =========================================================
     15. INVENTORY MANAGEMENT PAGE
     Read-only monitoring for Quantity Tracking.
     All stock values come from Inventory.gs.
  ========================================================= */

  const inventoryUiState = {
    catalog: null,
    uomById: {},
    requestId: 0
  };

  const inventoryStockStatusLabels = {
    AVAILABLE: "Available",
    RESERVED: "Reserved",
    QUARANTINE: "Quarantine",
    IN_TRANSIT: "In Transit"
  };

  function renderInventoryPage() {

    const content = document.getElementById("page-content");
    if (!content) {
      renderModuleError("Kontainer halaman tidak ditemukan.");
      return;
    }

    ensureInventoryPageStyles();

    content.innerHTML = `
      <section class="wms-inv-page">
        <div class="wms-inv-heading">
          <div>
            <div class="wms-inv-eyebrow">STOCK CONTROL</div>
            <h1>Inventory Management</h1>
            <p>Pantau jumlah stok Consumable berdasarkan item, lokasi penyimpanan, dan status stok. Halaman ini hanya untuk monitoring.</p>
          </div>
          <button type="button" class="wms-inv-button" id="inv-refresh">↻ Refresh</button>
        </div>

        <div id="inv-error" class="wms-inv-alert hidden" role="alert"></div>
        <div id="inv-loading" class="wms-inv-loading">Memuat inventory...</div>

        <div class="wms-inv-stats">
          <article class="wms-inv-stat">
            <span>Active Quantity Items</span>
            <strong id="inv-stat-items">—</strong>
            <small>Item aktif dengan Quantity Tracking</small>
          </article>
          <article class="wms-inv-stat">
            <span>Total Quantity on Hand</span>
            <strong id="inv-stat-onhand">—</strong>
            <small>Termasuk seluruh stock status</small>
          </article>
          <article class="wms-inv-stat">
            <span>Available Stock</span>
            <strong id="inv-stat-available">—</strong>
            <small>Stock status AVAILABLE</small>
          </article>
          <article class="wms-inv-stat alert-stat">
            <span>Items Need Attention</span>
            <strong id="inv-stat-alerts">—</strong>
            <small>Tanpa stok tersedia atau di bawah minimum</small>
          </article>
        </div>

        <section class="wms-inv-panel">
          <div class="wms-inv-panel-head">
            <div>
              <h2>Stock Summary by Item</h2>
              <p>Ringkasan seluruh lokasi untuk setiap item aktif. Item tanpa saldo juga tetap ditampilkan.</p>
            </div>
            <div class="wms-inv-filters">
              <input type="search" id="inv-search" placeholder="Search item code or name..." autocomplete="off">
              <select id="inv-health-filter" aria-label="Filter stock health">
                <option value="ALL">All Stock Conditions</option>
                <option value="NO_AVAILABLE">No Available Stock</option>
                <option value="LOW">Low Stock</option>
                <option value="HEALTHY">Healthy</option>
              </select>
            </div>
          </div>
          <div class="wms-inv-table-wrap">
            <table class="wms-inv-table">
              <thead>
                <tr>
                  <th>Item Code</th>
                  <th>Item Name</th>
                  <th>Base UOM</th>
                  <th class="num">Available</th>
                  <th class="num">Reserved</th>
                  <th class="num">Quarantine</th>
                  <th class="num">In Transit</th>
                  <th class="num">Total on Hand</th>
                  <th class="num">Minimum</th>
                  <th class="num">Reorder Qty</th>
                  <th>Stock Health</th>
                </tr>
              </thead>
              <tbody id="inv-item-body">
                <tr><td colspan="11" class="wms-inv-empty">Memuat data...</td></tr>
              </tbody>
            </table>
          </div>
          <div class="wms-inv-footnote">Available Stock hanya menghitung status AVAILABLE. Barang berstatus RESERVED, QUARANTINE, atau IN_TRANSIT tetap masuk Total Quantity on Hand, tetapi tidak dihitung sebagai Available.</div>
        </section>

        <section class="wms-inv-panel">
          <div class="wms-inv-panel-head">
            <div>
              <h2>Stock by Location</h2>
              <p>Rincian saldo per item, lokasi, dan status berdasarkan Inventory Balance.</p>
            </div>
            <div class="wms-inv-filters">
              <select id="inv-location-filter" aria-label="Filter location">
                <option value="ALL">All Locations</option>
              </select>
              <select id="inv-status-filter" aria-label="Filter stock status">
                <option value="ALL">All Stock Statuses</option>
                <option value="AVAILABLE">Available</option>
                <option value="RESERVED">Reserved</option>
                <option value="QUARANTINE">Quarantine</option>
                <option value="IN_TRANSIT">In Transit</option>
              </select>
            </div>
          </div>
          <div class="wms-inv-table-wrap">
            <table class="wms-inv-table location-table">
              <thead>
                <tr>
                  <th>Item Code</th>
                  <th>Item Name</th>
                  <th>Location</th>
                  <th>Stock Status</th>
                  <th class="num">Quantity on Hand</th>
                  <th>Last Updated</th>
                </tr>
              </thead>
              <tbody id="inv-location-body">
                <tr><td colspan="6" class="wms-inv-empty">Belum ada saldo stok.</td></tr>
              </tbody>
            </table>
          </div>
          <div class="wms-inv-footnote">Saldo bersifat read-only. Perubahan stok hanya dapat dilakukan melalui Inventory Transactions.</div>
        </section>

        <section class="wms-inv-panel">
          <div class="wms-inv-panel-head">
            <div>
              <h2>Recent Stock Movements</h2>
              <p>100 mutasi terbaru dari Inventory Ledger. Nilai positif menambah saldo, nilai negatif mengurangi saldo.</p>
            </div>
            <span class="wms-inv-readonly">LEDGER · READ ONLY</span>
          </div>
          <div class="wms-inv-table-wrap">
            <table class="wms-inv-table movement-table">
              <thead>
                <tr>
                  <th>Posted At</th>
                  <th>Transaction No.</th>
                  <th>Type</th>
                  <th>Item</th>
                  <th>Location</th>
                  <th>Stock Status</th>
                  <th class="num">Quantity Change</th>
                  <th>Posted By</th>
                </tr>
              </thead>
              <tbody id="inv-ledger-body">
                <tr><td colspan="8" class="wms-inv-empty">Belum ada pergerakan stok.</td></tr>
              </tbody>
            </table>
          </div>
        </section>

        <div id="wms-inv-toast-stack" class="wms-inv-toast-stack" aria-live="polite"></div>
      </section>
    `;

    bindInventoryPageEvents();
    loadInventoryCatalog(false);

  }


  function ensureInventoryPageStyles() {

    if (document.getElementById("wms-inventory-page-styles")) return;

    const style = document.createElement("style");
    style.id = "wms-inventory-page-styles";
    style.textContent = `
      .wms-inv-page{--inv-bg:#07090e;--inv-surface:#0d1119;--inv-raised:#111722;--inv-hover:#151d29;--inv-line:#202936;--inv-line-bright:#2c3948;--inv-text:#f1f5f7;--inv-soft:#a7b0bc;--inv-muted:#8793a2;--inv-cyan:#26f4d0;width:100%;min-height:calc(100vh - 82px);padding:28px clamp(18px,2.1vw,32px) 46px;background:var(--inv-bg);color:var(--inv-text);font-family:Manrope,Arial,sans-serif;color-scheme:dark}
      .wms-inv-page *{box-sizing:border-box}
      .wms-inv-heading{display:flex;align-items:flex-end;justify-content:space-between;gap:18px;max-width:1480px;margin:0 auto 22px}
      .wms-inv-eyebrow{margin-bottom:7px;color:var(--inv-cyan);font:600 9px "JetBrains Mono",monospace;letter-spacing:.16em;text-transform:uppercase}
      .wms-inv-heading h1{margin:0;color:var(--inv-text);font-size:25px;line-height:1.2;font-weight:800;letter-spacing:-.03em}
      .wms-inv-heading p,.wms-inv-panel-head p{margin:6px 0 0;color:var(--inv-soft);font-size:11px;line-height:1.55}
      .wms-inv-button{appearance:none;border:1px solid var(--inv-line-bright);border-radius:8px;padding:10px 14px;background:var(--inv-raised);color:var(--inv-text);font:700 11px Manrope,Arial,sans-serif;cursor:pointer;white-space:nowrap}
      .wms-inv-button:hover:not(:disabled){border-color:var(--inv-cyan);color:var(--inv-cyan)}
      .wms-inv-button:disabled{opacity:.5;cursor:not-allowed}
      .wms-inv-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;max-width:1480px;margin:0 auto 18px}
      .wms-inv-stat{min-width:0;padding:16px 17px;border:1px solid var(--inv-line);border-radius:12px;background:linear-gradient(145deg,rgba(38,244,208,.045),var(--inv-raised) 42%,var(--inv-surface));box-shadow:0 8px 24px rgba(0,0,0,.12)}
      .wms-inv-stat span{display:block;color:var(--inv-soft);font-size:10px;font-weight:600}
      .wms-inv-stat strong{display:block;margin-top:9px;color:var(--inv-text);font:700 25px "JetBrains Mono",monospace}
      .wms-inv-stat small{display:block;margin-top:5px;color:var(--inv-muted);font-size:9px}
      .wms-inv-stat.alert-stat strong{color:#ffc36b}
      .wms-inv-panel{max-width:1480px;margin:0 auto 16px;overflow:hidden;border:1px solid var(--inv-line);border-radius:13px;background:var(--inv-surface);box-shadow:0 8px 24px rgba(0,0,0,.1)}
      .wms-inv-panel-head{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:17px 19px;border-bottom:1px solid var(--inv-line);background:linear-gradient(90deg,rgba(38,244,208,.035),transparent 55%)}
      .wms-inv-panel-head h2{margin:0;color:var(--inv-text);font-size:13px;font-weight:800}
      .wms-inv-filters{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
      .wms-inv-filters input,.wms-inv-filters select{height:36px;max-width:220px;padding:0 10px;border:1px solid var(--inv-line-bright);border-radius:7px;outline:none;background:var(--inv-raised);color:var(--inv-text);font:500 10px Manrope,Arial,sans-serif;color-scheme:dark}
      .wms-inv-filters input{width:205px}
      .wms-inv-filters input::placeholder{color:var(--inv-muted)}
      .wms-inv-filters input:focus,.wms-inv-filters select:focus{border-color:var(--inv-cyan);box-shadow:0 0 0 2px rgba(38,244,208,.09)}
      .wms-inv-table-wrap{width:100%;overflow:auto}
      .wms-inv-table{width:100%;min-width:1050px;border-collapse:collapse;background:var(--inv-surface)}
      .wms-inv-table.location-table{min-width:780px}
      .wms-inv-table.movement-table{min-width:980px}
      .wms-inv-readonly{display:inline-flex;align-items:center;padding:5px 7px;border:1px solid var(--inv-line-bright);border-radius:5px;color:var(--inv-muted);font:600 8px "JetBrains Mono",monospace;letter-spacing:.1em;white-space:nowrap}
      .wms-inv-qty-positive{color:var(--inv-cyan)!important;font-weight:800!important}
      .wms-inv-qty-negative{color:#ff8d99!important;font-weight:800!important}
      .wms-inv-table th{padding:12px 13px;border-bottom:1px solid var(--inv-line);background:var(--inv-raised);color:var(--inv-muted);text-align:left;white-space:nowrap;font:600 9px "JetBrains Mono",monospace}
      .wms-inv-table td{padding:12px 13px;border-bottom:1px solid rgba(255,255,255,.055);background:var(--inv-surface);color:var(--inv-soft);font-size:10px;vertical-align:middle}
      .wms-inv-table tbody tr:hover td{background:var(--inv-hover)}
      .wms-inv-table td strong{color:var(--inv-text);font-weight:700}
      .wms-inv-table .num{text-align:right;font-variant-numeric:tabular-nums}
      .wms-inv-empty{padding:28px!important;text-align:center!important;color:var(--inv-muted)!important}
      .wms-inv-health,.wms-inv-stock-status{display:inline-flex;align-items:center;padding:5px 8px;border-radius:99px;font:700 8px "JetBrains Mono",monospace;white-space:nowrap}
      .wms-inv-health.HEALTHY,.wms-inv-stock-status.AVAILABLE{background:rgba(38,244,208,.11);color:var(--inv-cyan)}
      .wms-inv-health.LOW{background:rgba(255,189,90,.13);color:#ffc36b}
      .wms-inv-health.NO_AVAILABLE,.wms-inv-stock-status.QUARANTINE{background:rgba(255,100,116,.12);color:#ff8d99}
      .wms-inv-stock-status.RESERVED{background:rgba(155,124,255,.13);color:#bba6ff}
      .wms-inv-stock-status.IN_TRANSIT{background:rgba(255,189,90,.13);color:#ffc36b}
      .wms-inv-footnote{padding:12px 17px;border-top:1px solid var(--inv-line);background:rgba(255,255,255,.012);color:var(--inv-muted);font-size:9px;line-height:1.5}
      .wms-inv-loading{max-width:1480px;margin:0 auto 14px;padding:10px 0;color:var(--inv-muted);font-size:10px}
      .wms-inv-alert{max-width:1480px;margin:0 auto 14px;padding:11px 13px;border:1px solid rgba(255,100,116,.3);border-radius:7px;background:rgba(255,100,116,.1);color:#ff9aa5;font-size:10px;line-height:1.5}
      .wms-inv-alert.hidden{display:none}
      .wms-inv-toast-stack{position:fixed;top:18px;right:18px;z-index:1200;display:flex;flex-direction:column;gap:8px;width:min(360px,calc(100vw - 36px));pointer-events:none}
      .wms-inv-toast{display:flex;align-items:flex-start;gap:10px;padding:12px 14px;border:1px solid #236246;border-left:4px solid #26b875;border-radius:9px;background:#10251e;color:#d8f8e8;box-shadow:0 12px 30px rgba(0,0,0,.35);font-size:10px;line-height:1.5;pointer-events:auto}
      .wms-inv-toast button{margin-left:auto;border:0;background:transparent;color:inherit;font-size:15px;cursor:pointer}
      @media(max-width:1050px){.wms-inv-stats{grid-template-columns:repeat(2,minmax(0,1fr))}.wms-inv-panel-head{align-items:flex-start;flex-direction:column}}
      @media(max-width:600px){.wms-inv-page{padding:20px 14px 34px}.wms-inv-heading{align-items:flex-start;flex-direction:column}.wms-inv-heading h1{font-size:21px}.wms-inv-stats{gap:8px}.wms-inv-stat{padding:12px}.wms-inv-stat strong{font-size:20px}.wms-inv-filters{width:100%}.wms-inv-filters input,.wms-inv-filters select{max-width:none;flex:1 1 140px}}
    `;
    document.head.appendChild(style);

  }


  function bindInventoryPageEvents() {

    document.getElementById("inv-refresh").addEventListener("click", function() {
      loadInventoryCatalog(true);
    });

    document.getElementById("inv-search").addEventListener("input", function() {
      renderInventoryItemSummary();
      renderInventoryLocationBalances();
      renderInventoryMovementHistory();
    });

    document.getElementById("inv-health-filter").addEventListener("change", renderInventoryItemSummary);
    document.getElementById("inv-location-filter").addEventListener("change", renderInventoryLocationBalances);
    document.getElementById("inv-status-filter").addEventListener("change", renderInventoryLocationBalances);

  }


  function loadInventoryCatalog(showRefreshToast) {

    const requestId = ++inventoryUiState.requestId;
    const loading = document.getElementById("inv-loading");
    const refreshButton = document.getElementById("inv-refresh");
    const error = document.getElementById("inv-error");

    if (loading) {
      loading.textContent = "Memuat ringkasan stok dan saldo lokasi...";
      loading.classList.remove("hidden");
    }
    if (refreshButton) {
      refreshButton.disabled = true;
      refreshButton.textContent = "Loading...";
    }
    if (error) {
      error.textContent = "";
      error.classList.add("hidden");
    }

    google.script.run
      .withSuccessHandler(function(result) {

        if (currentPage !== "inventory" || requestId !== inventoryUiState.requestId) return;

        if (!result || !result.ok) {
          finishInventoryLoading();
          showInventoryError("Respons Inventory tidak valid.");
          return;
        }

        inventoryUiState.catalog = result;

        google.script.run
          .withSuccessHandler(function(masterResult) {

            if (currentPage !== "inventory" || requestId !== inventoryUiState.requestId) return;

            inventoryUiState.uomById = {};
            const uoms = masterResult && Array.isArray(masterResult.uoms) ? masterResult.uoms : [];
            uoms.forEach(function(uom) {
              inventoryUiState.uomById[String(uom.uom_id || "")] =
                String(uom.uom_name || uom.uom_code || uom.uom_id || "");
            });

            finishInventoryLoading();
            populateInventoryLocationFilter();
            renderInventoryStats();
            renderInventoryItemSummary();
            renderInventoryLocationBalances();
            renderInventoryMovementHistory();

            if (showRefreshToast) {
              showInventoryToast("Inventory berhasil diperbarui.");
            }

          })
          .withFailureHandler(function() {

            if (currentPage !== "inventory" || requestId !== inventoryUiState.requestId) return;

            inventoryUiState.uomById = {};
            finishInventoryLoading();
            populateInventoryLocationFilter();
            renderInventoryStats();
            renderInventoryItemSummary();
            renderInventoryLocationBalances();
            renderInventoryMovementHistory();

            if (showRefreshToast) {
              showInventoryToast("Saldo berhasil diperbarui. Nama UOM tidak dapat dimuat.");
            }

          })
          .getMasterDataCatalog();

      })
      .withFailureHandler(function(errorObject) {

        if (currentPage !== "inventory" || requestId !== inventoryUiState.requestId) return;

        finishInventoryLoading();
        showInventoryError(getAppErrorMessage(errorObject));

      })
      .getInventoryManagementCatalog();

  }


  function finishInventoryLoading() {

    const loading = document.getElementById("inv-loading");
    const refreshButton = document.getElementById("inv-refresh");
    if (loading) loading.classList.add("hidden");
    if (refreshButton) {
      refreshButton.disabled = false;
      refreshButton.textContent = "↻ Refresh";
    }

  }


  function getInventoryComputedData() {

    const catalog = inventoryUiState.catalog || {};
    const items = Array.isArray(catalog.items) ? catalog.items : [];
    const balances = Array.isArray(catalog.balances) ? catalog.balances : [];
    const byItem = {};

    items.forEach(function(item) {
      byItem[String(item.item_id)] = {
        item: item,
        available: 0,
        reserved: 0,
        quarantine: 0,
        inTransit: 0,
        total: 0,
        locations: {},
        lineCount: 0
      };
    });

    balances.forEach(function(balance) {
      const itemId = String(balance.item_id || "");
      // Item Summary is limited to active Quantity Tracking items.
      // Historical balances for inactive/unlisted items remain visible in
      // the location-level balance and ledger tables below.
      const summary = byItem[itemId];
      if (!summary) return;
      const quantity = Number(balance.quantity_on_hand) || 0;
      const status = String(balance.stock_status || "").toUpperCase();
      summary.total += quantity;
      summary.lineCount += 1;
      if (status === "AVAILABLE") summary.available += quantity;
      if (status === "RESERVED") summary.reserved += quantity;
      if (status === "QUARANTINE") summary.quarantine += quantity;
      if (status === "IN_TRANSIT") summary.inTransit += quantity;
      if (balance.location_id) summary.locations[String(balance.location_id)] = true;
    });

    const summaries = Object.keys(byItem).map(function(itemId) {
      const row = byItem[itemId];
      const minimum = Number(row.item.minimum_stock) || 0;
      let health = "HEALTHY";
      if (row.available <= 0) health = "NO_AVAILABLE";
      else if (minimum > 0 && row.available <= minimum) health = "LOW";
      return {
        item: row.item,
        available: row.available,
        reserved: row.reserved,
        quarantine: row.quarantine,
        inTransit: row.inTransit,
        total: row.total,
        locationCount: Object.keys(row.locations).length,
        lineCount: row.lineCount,
        minimum: minimum,
        reorder: Number(row.item.reorder_quantity) || 0,
        health: health
      };
    });

    summaries.sort(function(a, b) {
      return String(a.item.item_code || "").localeCompare(String(b.item.item_code || ""));
    });

    return {
      items: summaries,
      balances: balances,
      totalOnHand: balances.reduce(function(total, row) {
        return total + (Number(row.quantity_on_hand) || 0);
      }, 0),
      totalAvailable: balances.reduce(function(total, row) {
        return String(row.stock_status || "").toUpperCase() === "AVAILABLE"
          ? total + (Number(row.quantity_on_hand) || 0)
          : total;
      }, 0)
    };

  }


  function renderInventoryStats() {

    const computed = getInventoryComputedData();
    const alertCount = computed.items.filter(function(row) {
      return row.health !== "HEALTHY";
    }).length;

    setTextIfExists("inv-stat-items", computed.items.length.toLocaleString("id-ID"));
    setTextIfExists("inv-stat-onhand", formatTransactionNumber(computed.totalOnHand));
    setTextIfExists("inv-stat-available", formatTransactionNumber(computed.totalAvailable));
    setTextIfExists("inv-stat-alerts", alertCount.toLocaleString("id-ID"));

  }


  function renderInventoryItemSummary() {

    const body = document.getElementById("inv-item-body");
    if (!body) return;
    body.replaceChildren();

    const computed = getInventoryComputedData();
    const query = String(document.getElementById("inv-search").value || "").trim().toLowerCase();
    const healthFilter = document.getElementById("inv-health-filter").value;

    const filtered = computed.items.filter(function(row) {
      const item = row.item;
      const searchText = [item.item_code, item.item_name, inventoryUiState.uomById[item.base_uom_id] || item.base_uom_id].join(" ").toLowerCase();
      return (!query || searchText.includes(query)) &&
        (healthFilter === "ALL" || row.health === healthFilter);
    });

    if (!filtered.length) {
      const row = document.createElement("tr");
      const cell = document.createElement("td");
      cell.colSpan = 11;
      cell.className = "wms-inv-empty";
      cell.textContent = "Tidak ada item yang sesuai dengan filter.";
      row.appendChild(cell);
      body.appendChild(row);
      return;
    }

    filtered.forEach(function(summary) {
      const item = summary.item;
      const row = document.createElement("tr");
      appendTextCell(row, item.item_code || item.item_id || "-");
      const nameCell = document.createElement("td");
      const nameStrong = document.createElement("strong");
      nameStrong.textContent = item.item_name || "-";
      nameCell.appendChild(nameStrong);
      row.appendChild(nameCell);
      appendTextCell(row, inventoryUiState.uomById[item.base_uom_id] || item.base_uom_id || "-");
      appendInventoryNumberCell(row, summary.available);
      appendInventoryNumberCell(row, summary.reserved);
      appendInventoryNumberCell(row, summary.quarantine);
      appendInventoryNumberCell(row, summary.inTransit);
      appendInventoryNumberCell(row, summary.total, true);
      appendInventoryNumberCell(row, summary.minimum);
      appendInventoryNumberCell(row, summary.reorder);
      const statusCell = document.createElement("td");
      const badge = document.createElement("span");
      badge.className = "wms-inv-health " + summary.health;
      badge.textContent = inventoryHealthLabel(summary.health);
      statusCell.appendChild(badge);
      row.appendChild(statusCell);
      body.appendChild(row);
    });

  }


  function renderInventoryLocationBalances() {

    const body = document.getElementById("inv-location-body");
    if (!body) return;
    body.replaceChildren();

    const catalog = inventoryUiState.catalog || {};
    const balances = Array.isArray(catalog.balances) ? catalog.balances : [];
    const query = String(document.getElementById("inv-search").value || "").trim().toLowerCase();
    const locationFilter = document.getElementById("inv-location-filter").value;
    const statusFilter = document.getElementById("inv-status-filter").value;

    const filtered = balances.filter(function(balance) {
      const searchText = [balance.item_code, balance.item_name, balance.location_name, balance.stock_status].join(" ").toLowerCase();
      return (!query || searchText.includes(query)) &&
        (locationFilter === "ALL" || String(balance.location_id) === locationFilter) &&
        (statusFilter === "ALL" || String(balance.stock_status).toUpperCase() === statusFilter);
    }).slice().sort(function(a, b) {
      const itemOrder = String(a.item_code || "").localeCompare(String(b.item_code || ""));
      if (itemOrder !== 0) return itemOrder;
      const locationOrder = String(a.location_name || "").localeCompare(String(b.location_name || ""));
      if (locationOrder !== 0) return locationOrder;
      return String(a.stock_status || "").localeCompare(String(b.stock_status || ""));
    });

    if (!filtered.length) {
      const row = document.createElement("tr");
      const cell = document.createElement("td");
      cell.colSpan = 6;
      cell.className = "wms-inv-empty";
      cell.textContent = "Belum ada saldo stok untuk filter ini.";
      row.appendChild(cell);
      body.appendChild(row);
      return;
    }

    filtered.forEach(function(balance) {
      const row = document.createElement("tr");
      appendTextCell(row, balance.item_code || balance.item_id || "-");
      appendTextCell(row, balance.item_name || "-");
      appendTextCell(row, balance.location_name || balance.location_id || "-");
      const statusCell = document.createElement("td");
      const badge = document.createElement("span");
      const status = String(balance.stock_status || "").toUpperCase();
      badge.className = "wms-inv-stock-status " + status;
      badge.textContent = inventoryStockStatusLabels[status] || status || "-";
      statusCell.appendChild(badge);
      row.appendChild(statusCell);
      appendInventoryNumberCell(row, balance.quantity_on_hand, true);
      appendTextCell(row, balance.updated_at || "-");
      body.appendChild(row);
    });

  }


  function renderInventoryMovementHistory() {

    const body = document.getElementById("inv-ledger-body");
    if (!body) return;
    body.replaceChildren();

    const catalog = inventoryUiState.catalog || {};
    const ledger = Array.isArray(catalog.recentLedger) ? catalog.recentLedger : [];
    const query = String(document.getElementById("inv-search").value || "").trim().toLowerCase();

    const filtered = ledger.filter(function(entry) {
      const searchText = [
        entry.transaction_no,
        entry.transaction_type,
        entry.item_code,
        entry.item_name,
        entry.location_code,
        entry.location_name,
        entry.stock_status,
        entry.posted_by
      ].join(" ").toLowerCase();
      return !query || searchText.includes(query);
    });

    if (!filtered.length) {
      const row = document.createElement("tr");
      const cell = document.createElement("td");
      cell.colSpan = 8;
      cell.className = "wms-inv-empty";
      cell.textContent = ledger.length
        ? "Tidak ada mutasi yang sesuai dengan pencarian."
        : "Belum ada pergerakan stok yang diposting.";
      row.appendChild(cell);
      body.appendChild(row);
      return;
    }

    filtered.forEach(function(entry) {
      const row = document.createElement("tr");
      appendTextCell(row, entry.posted_at || entry.event_at || "-");
      appendTextCell(row, entry.transaction_no || entry.transaction_id || "-");
      appendTextCell(row, inventoryTransactionTypeLabel(entry.transaction_type));
      appendTextCell(row, [entry.item_code, entry.item_name].filter(Boolean).join(" · ") || "-");
      appendTextCell(row, [entry.location_code, entry.location_name].filter(Boolean).join(" · ") || "-");

      const statusCell = document.createElement("td");
      const badge = document.createElement("span");
      const status = String(entry.stock_status || "").toUpperCase();
      badge.className = "wms-inv-stock-status " + status;
      badge.textContent = inventoryStockStatusLabels[status] || status || "-";
      statusCell.appendChild(badge);
      row.appendChild(statusCell);

      const delta = Number(entry.quantity_delta) || 0;
      const deltaCell = document.createElement("td");
      deltaCell.className = "num " + (delta > 0 ? "wms-inv-qty-positive" : delta < 0 ? "wms-inv-qty-negative" : "");
      deltaCell.textContent = (delta > 0 ? "+" : "") + formatTransactionNumber(delta);
      row.appendChild(deltaCell);

      appendTextCell(row, entry.posted_by || "-");
      body.appendChild(row);
    });

  }


  function inventoryTransactionTypeLabel(type) {

    const labels = {
      RECEIVING: "Receiving",
      ISSUE: "Issuance",
      RETURN: "Return",
      TRANSFER: "Transfer",
      ADJUSTMENT: "Adjustment"
    };
    const key = String(type || "").toUpperCase();
    return labels[key] || key || "-";

  }


  function populateInventoryLocationFilter() {

    const select = document.getElementById("inv-location-filter");
    if (!select) return;
    const previousValue = select.value || "ALL";
    select.replaceChildren();

    const all = document.createElement("option");
    all.value = "ALL";
    all.textContent = "All Locations";
    select.appendChild(all);

    const locations = inventoryUiState.catalog && Array.isArray(inventoryUiState.catalog.locations)
      ? inventoryUiState.catalog.locations
      : [];

    locations.slice().sort(function(a, b) {
      return String(a.location_name || "").localeCompare(String(b.location_name || ""));
    }).forEach(function(location) {
      const option = document.createElement("option");
      option.value = location.location_id;
      option.textContent = [location.location_code, location.location_name].filter(Boolean).join(" · ");
      select.appendChild(option);
    });

    if (["ALL"].concat(locations.map(function(row) { return row.location_id; })).includes(previousValue)) {
      select.value = previousValue;
    }

  }


  function appendInventoryNumberCell(row, value, strong) {

    const cell = document.createElement("td");
    cell.className = "num";
    const target = strong ? document.createElement("strong") : cell;
    target.textContent = formatTransactionNumber(value);
    if (strong) cell.appendChild(target);
    row.appendChild(cell);

  }


  function inventoryHealthLabel(health) {

    if (health === "NO_AVAILABLE") return "NO AVAILABLE STOCK";
    if (health === "LOW") return "LOW STOCK";
    return "HEALTHY";

  }


  function showInventoryError(message) {

    const error = document.getElementById("inv-error");
    if (!error) return;
    error.textContent = message;
    error.classList.remove("hidden");

  }


  function showInventoryToast(message) {

    const stack = document.getElementById("wms-inv-toast-stack");
    if (!stack) return;
    const toast = document.createElement("div");
    toast.className = "wms-inv-toast";
    const text = document.createElement("span");
    text.textContent = String(message || "Inventory berhasil diperbarui.");
    const close = document.createElement("button");
    close.type = "button";
    close.textContent = "×";
    close.setAttribute("aria-label", "Close notification");
    const remove = function() {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    };
    close.addEventListener("click", remove);
    toast.appendChild(text);
    toast.appendChild(close);
    stack.appendChild(toast);
    window.setTimeout(remove, 3500);

  }


  /* =========================================================
     16. INVENTORY TRANSACTIONS PAGE
     Quantity-tracked items only.
     All stock mutations go through Inventory.gs.
  ========================================================= */

  const transactionUiState = {
    catalog: null,
    uomById: {},
    requestId: 0,
    lines: [],
    nextLineId: 1,
    activeDetail: null,
    saving: false
  };


  const transactionTypeLabels = {
    RECEIVING: "Receiving",
    ISSUE: "Issuance",
    RETURN: "Return",
    TRANSFER: "Transfer",
    ADJUSTMENT: "Stock Adjustment"
  };


  const stockStatusLabels = {
    AVAILABLE: "Available",
    RESERVED: "Reserved",
    QUARANTINE: "Quarantine",
    IN_TRANSIT: "In Transit"
  };


  function renderTransactionsPage() {

    const content = document.getElementById("page-content");

    if (!content) {
      renderModuleError("Kontainer halaman tidak ditemukan.");
      return;
    }

    ensureTransactionPageStyles();

    content.innerHTML = `
      <section class="wms-tx-page">

        <div class="wms-tx-heading">
          <div>
            <div class="wms-tx-eyebrow">INVENTORY OPERATIONS</div>
            <h1>Inventory Transactions</h1>
            <p>Simpan sebagai Draft untuk dilanjutkan nanti, atau Save &amp; Post untuk langsung memperbarui stok. Mendukung item Quantity Tracking.</p>
          </div>
          <div class="wms-tx-heading-actions">
            <button type="button" class="wms-tx-button secondary" id="tx-refresh">
              <span aria-hidden="true">↻</span> Refresh
            </button>
            <button type="button" class="wms-tx-button primary" id="tx-new">
              <span aria-hidden="true">＋</span> New Transaction
            </button>
          </div>
        </div>

        <div class="wms-tx-stats">
          <article class="wms-tx-stat">
            <span>Draft Transactions</span>
            <strong id="tx-stat-draft">—</strong>
            <small>Dari 100 transaksi terbaru</small>
          </article>
          <article class="wms-tx-stat">
            <span>Posted Transactions</span>
            <strong id="tx-stat-posted">—</strong>
            <small>Dari 100 transaksi terbaru</small>
          </article>
          <article class="wms-tx-stat">
            <span>Stock Balance Lines</span>
            <strong id="tx-stat-balances">—</strong>
            <small>Item, lokasi, dan status</small>
          </article>
          <article class="wms-tx-stat">
            <span>Total Quantity on Hand</span>
            <strong id="tx-stat-quantity">—</strong>
            <small>Akumulasi seluruh status stok</small>
          </article>
        </div>

        <div class="wms-tx-panel">
          <div class="wms-tx-panel-head">
            <div>
              <h2>Transaction History</h2>
              <p>Menampilkan hingga 100 transaksi terbaru.</p>
            </div>
            <div class="wms-tx-filters">
              <select id="tx-filter-type" aria-label="Filter transaction type">
                <option value="ALL">All Types</option>
                <option value="RECEIVING">Receiving</option>
                <option value="ISSUE">Issuance</option>
                <option value="RETURN">Return</option>
                <option value="TRANSFER">Transfer</option>
                <option value="ADJUSTMENT">Adjustment</option>
              </select>
              <select id="tx-filter-status" aria-label="Filter transaction status">
                <option value="ALL">All Statuses</option>
                <option value="DRAFT">Draft</option>
                <option value="POSTING">Posting</option>
                <option value="POSTED">Posted</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
              <input id="tx-search" type="search" placeholder="Search transaction..." autocomplete="off">
            </div>
          </div>

          <div id="tx-error" class="wms-tx-alert hidden" role="alert"></div>
          <div id="tx-loading" class="wms-tx-loading">Memuat data transaksi...</div>

          <div class="wms-tx-table-wrap">
            <table class="wms-tx-table">
              <thead>
                <tr>
                  <th>Transaction No.</th>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Reference</th>
                  <th>Purpose</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody id="tx-table-body">
                <tr><td colspan="7" class="wms-tx-empty">Memuat data...</td></tr>
              </tbody>
            </table>
          </div>

          <div class="wms-tx-footnote">
            Draft belum memengaruhi stok. Stok berubah hanya setelah transaksi berhasil diposting.
          </div>
        </div>

        <div class="wms-tx-panel wms-tx-balance-panel">
          <div class="wms-tx-panel-head">
            <div>
              <h2>Current Quantity Balances</h2>
              <p>Saldo non-zero yang sudah dibentuk dari Inventory Ledger.</p>
            </div>
            <span class="wms-tx-readonly">READ ONLY</span>
          </div>
          <div class="wms-tx-table-wrap">
            <table class="wms-tx-table">
              <thead>
                <tr>
                  <th>Item Code</th>
                  <th>Item Name</th>
                  <th>Location</th>
                  <th>Stock Status</th>
                  <th class="number">Quantity on Hand</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody id="tx-balance-body">
                <tr><td colspan="6" class="wms-tx-empty">Belum ada saldo stok.</td></tr>
              </tbody>
            </table>
          </div>
        </div>

      </section>

      <div id="tx-create-modal" class="wms-tx-modal hidden" role="dialog" aria-modal="true" aria-labelledby="tx-modal-title">
        <div class="wms-tx-modal-card">
          <div class="wms-tx-modal-header">
            <div>
              <div class="wms-tx-eyebrow">NEW INVENTORY TRANSACTION</div>
              <h2 id="tx-modal-title">New Inventory Transaction</h2>
              <p id="tx-modal-subtitle">Pilih Save Draft untuk menyimpan sementara, atau Save &amp; Post jika data sudah benar.</p>
            </div>
            <button type="button" class="wms-tx-icon-button" id="tx-close-modal" aria-label="Close">×</button>
          </div>

          <form id="tx-create-form">
            <div id="tx-form-error" class="wms-tx-alert hidden" role="alert"></div>

            <div class="wms-tx-form-grid">
              <label class="wms-tx-field">
                <span>Transaction Type *</span>
                <select id="tx-form-type" required>
                  <option value="RECEIVING">Receiving</option>
                  <option value="ISSUE">Issuance</option>
                  <option value="RETURN">Return</option>
                  <option value="TRANSFER">Transfer</option>
                  <option value="ADJUSTMENT">Stock Adjustment</option>
                </select>
              </label>

              <label class="wms-tx-field">
                <span>Transaction Date *</span>
                <input id="tx-form-date" type="date" required>
              </label>

              <label class="wms-tx-field">
                <span>Requester</span>
                <select id="tx-form-requester">
                  <option value="">-- Optional --</option>
                </select>
              </label>

              <label class="wms-tx-field">
                <span>Receiver / Custodian</span>
                <select id="tx-form-receiver">
                  <option value="">-- Optional --</option>
                </select>
              </label>

              <label class="wms-tx-field">
                <span>Reference No.</span>
                <input id="tx-form-reference" type="text" maxlength="100" placeholder="Nomor DO / form / dokumen">
              </label>

              <label class="wms-tx-field" id="tx-issue-mode-wrap">
                <span>Issue Mode</span>
                <input id="tx-form-issue-mode" type="text" maxlength="60" placeholder="Contoh: STANDARD">
              </label>

              <label class="wms-tx-field full">
                <span>Purpose</span>
                <input id="tx-form-purpose" type="text" maxlength="250" placeholder="Tujuan transaksi">
              </label>

              <label class="wms-tx-field full">
                <span>Notes</span>
                <textarea id="tx-form-notes" rows="2" maxlength="1000" placeholder="Catatan tambahan..."></textarea>
              </label>
            </div>

            <div id="tx-central-source-hint" class="wms-tx-info hidden">
              Sumber barang dapat dicatat sebagai Gudang Pusat melalui Reference No. atau Notes. Supplier tidak wajib diisi.
            </div>

            <div class="wms-tx-detail-heading">
              <div>
                <h3>Transaction Details</h3>
                <p>Gunakan Base UOM item. Konversi satuan belum tersedia.</p>
              </div>
              <button type="button" class="wms-tx-button secondary small" id="tx-add-line">＋ Add Item</button>
            </div>

            <div id="tx-detail-lines" class="wms-tx-detail-lines"></div>

            <div class="wms-tx-modal-footer">
              <button type="button" class="wms-tx-button secondary" id="tx-cancel-create">Close</button>
              <div class="wms-tx-save-actions">
                <button type="button" class="wms-tx-button secondary" id="tx-save-draft">Save Draft</button>
                <button type="button" class="wms-tx-button primary" id="tx-save-post">Save &amp; Post</button>
              </div>
            </div>
          </form>
        </div>
      </div>

      <div id="tx-view-modal" class="wms-tx-modal hidden" role="dialog" aria-modal="true" aria-labelledby="tx-view-title">
        <div class="wms-tx-modal-card">
          <div class="wms-tx-modal-header">
            <div>
              <div class="wms-tx-eyebrow">TRANSACTION DETAIL</div>
              <h2 id="tx-view-title">Transaction</h2>
              <p id="tx-view-subtitle"></p>
            </div>
            <button type="button" class="wms-tx-icon-button" id="tx-close-view" aria-label="Close">×</button>
          </div>
          <div id="tx-view-content" class="wms-tx-view-content"></div>
          <div id="tx-view-error" class="wms-tx-alert hidden" role="alert"></div>
          <div class="wms-tx-modal-footer" id="tx-view-actions"></div>
        </div>
      </div>

      <div id="wms-tx-toast-stack" class="wms-tx-toast-stack" aria-live="polite" aria-atomic="false"></div>
    `;

    bindTransactionsPageEvents();
    loadTransactionsCatalog(false);

  }


  function ensureTransactionPageStyles() {

    if (document.getElementById("wms-transaction-page-styles")) return;

    const style = document.createElement("style");
    style.id = "wms-transaction-page-styles";
    style.textContent = `
      .wms-tx-page{
        --tx-bg:#07090e;
        --tx-surface:#0d1119;
        --tx-raised:#111722;
        --tx-hover:#151d29;
        --tx-line:#202936;
        --tx-line-bright:#2c3948;
        --tx-text:#f1f5f7;
        --tx-soft:#a7b0bc;
        --tx-muted:#8793a2;
        --tx-cyan:#26f4d0;
        width:100%;max-width:none;min-height:calc(100vh - 82px);
        margin:0;padding:28px clamp(18px,2.1vw,32px) 46px;
        background:var(--tx-bg);color:var(--tx-text);
        font-family:Manrope,Arial,sans-serif;color-scheme:dark
      }
      .wms-tx-page *{box-sizing:border-box}
      .wms-tx-heading{display:flex;align-items:flex-end;justify-content:space-between;gap:18px;margin:0 auto 22px;max-width:1480px}
      .wms-tx-eyebrow{font:600 9px "JetBrains Mono",monospace;letter-spacing:.16em;color:var(--tx-cyan);text-transform:uppercase;margin-bottom:7px}
      .wms-tx-heading h1{font-size:25px;line-height:1.2;margin:0;color:var(--tx-text);font-weight:800;letter-spacing:-.03em}
      .wms-tx-heading p,.wms-tx-panel-head p,.wms-tx-modal-header p,.wms-tx-detail-heading p{margin:6px 0 0;color:var(--tx-soft);font-size:11px;line-height:1.55}
      .wms-tx-heading-actions{display:flex;gap:9px;flex-wrap:wrap}
      .wms-tx-button{appearance:none;border:1px solid var(--tx-line-bright);border-radius:8px;padding:10px 14px;font:700 11px Manrope,Arial,sans-serif;cursor:pointer;transition:.18s ease;white-space:nowrap}
      .wms-tx-button:disabled{opacity:.48;cursor:not-allowed;transform:none!important}
      .wms-tx-button.primary{background:var(--tx-cyan);border-color:var(--tx-cyan);color:#071311}
      .wms-tx-button.primary:hover:not(:disabled){filter:brightness(1.08);transform:translateY(-1px)}
      .wms-tx-button.secondary{background:var(--tx-raised);border-color:var(--tx-line-bright);color:var(--tx-text)}
      .wms-tx-button.secondary:hover:not(:disabled){border-color:var(--tx-cyan);color:var(--tx-cyan)}
      .wms-tx-button.small{padding:8px 11px}
      .wms-tx-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:0 auto 18px;max-width:1480px}
      .wms-tx-stat{min-width:0;padding:16px 17px;border:1px solid var(--tx-line);border-radius:12px;background:linear-gradient(145deg,rgba(38,244,208,.045),var(--tx-raised) 42%,var(--tx-surface));box-shadow:0 8px 24px rgba(0,0,0,.12)}
      .wms-tx-stat span{display:block;color:var(--tx-soft);font-size:10px;font-weight:600}
      .wms-tx-stat strong{display:block;font:700 25px "JetBrains Mono",monospace;margin-top:9px;color:var(--tx-text)}
      .wms-tx-stat small{display:block;color:var(--tx-muted);font-size:9px;margin-top:5px}
      .wms-tx-panel{max-width:1480px;margin:0 auto 16px;border:1px solid var(--tx-line);border-radius:13px;background:var(--tx-surface);overflow:hidden;box-shadow:0 8px 24px rgba(0,0,0,.10)}
      .wms-tx-panel-head{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:17px 19px;border-bottom:1px solid var(--tx-line);background:linear-gradient(90deg,rgba(38,244,208,.035),transparent 55%)}
      .wms-tx-panel-head h2{font-size:13px;margin:0;color:var(--tx-text);font-weight:800}
      .wms-tx-filters{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
      .wms-tx-filters select,.wms-tx-filters input{height:36px;max-width:185px;border:1px solid var(--tx-line-bright);border-radius:7px;padding:0 10px;background:var(--tx-raised);color:var(--tx-text);font:500 10px Manrope,Arial,sans-serif;outline:none;color-scheme:dark}
      .wms-tx-filters select:focus,.wms-tx-filters input:focus{border-color:var(--tx-cyan);box-shadow:0 0 0 2px rgba(38,244,208,.09)}
      .wms-tx-filters input{width:190px}
      .wms-tx-filters input::placeholder{color:var(--tx-muted)}
      .wms-tx-table-wrap{width:100%;overflow:auto}
      .wms-tx-table{width:100%;border-collapse:collapse;min-width:780px;background:var(--tx-surface)}
      .wms-tx-table th{padding:12px 13px;text-align:left;background:var(--tx-raised);color:var(--tx-muted);font:600 9px "JetBrains Mono",monospace;white-space:nowrap;border-bottom:1px solid var(--tx-line)}
      .wms-tx-table td{padding:13px;font-size:10px;color:var(--tx-soft);border-bottom:1px solid rgba(255,255,255,.055);vertical-align:middle;background:var(--tx-surface)}
      .wms-tx-table tbody tr:hover td{background:var(--tx-hover)}
      .wms-tx-table td strong{color:var(--tx-text);font-weight:700}
      .wms-tx-table .number{text-align:right}
      .wms-tx-empty{text-align:center!important;padding:27px!important;color:var(--tx-muted)!important}
      .wms-tx-status{display:inline-flex;align-items:center;border-radius:99px;padding:5px 9px;font:700 8px "JetBrains Mono",monospace;letter-spacing:.04em;white-space:nowrap}
      .wms-tx-status.DRAFT,.wms-tx-status.POSTING{background:rgba(255,189,90,.12);color:#ffc36b}
      .wms-tx-status.POSTED{background:rgba(38,244,208,.12);color:var(--tx-cyan)}
      .wms-tx-status.CANCELLED{background:rgba(255,100,116,.12);color:#ff7d8b}
      .wms-tx-row-action{appearance:none;border:1px solid var(--tx-line-bright);background:var(--tx-raised);color:var(--tx-cyan);border-radius:6px;padding:7px 10px;font:700 9px Manrope,Arial,sans-serif;cursor:pointer}
      .wms-tx-row-action:hover{background:rgba(38,244,208,.08);border-color:var(--tx-cyan)}
      .wms-tx-footnote{padding:12px 17px;color:var(--tx-muted);font-size:9px;border-top:1px solid var(--tx-line);background:rgba(255,255,255,.012)}
      .wms-tx-readonly{font:600 8px "JetBrains Mono",monospace;letter-spacing:.12em;color:var(--tx-muted);border:1px solid var(--tx-line-bright);border-radius:5px;padding:5px 7px}
      .wms-tx-loading{padding:12px 18px;color:var(--tx-muted);font-size:10px}
      .wms-tx-alert{margin:12px 18px;padding:11px 13px;border-radius:7px;font-size:10px;line-height:1.55}
      .wms-tx-alert.error{background:rgba(255,100,116,.10);border:1px solid rgba(255,100,116,.3);color:#ff9aa5}
      .wms-tx-alert.warning{background:rgba(255,189,90,.10);border:1px solid rgba(255,189,90,.3);color:#ffd18b}
      .wms-tx-info{margin:12px 22px 0;padding:11px 13px;border-radius:7px;background:rgba(38,244,208,.07);border:1px solid rgba(38,244,208,.2);color:var(--tx-soft);font-size:10px;line-height:1.5}
      .wms-tx-modal{--tx-bg:#07090e;--tx-surface:#0d1119;--tx-raised:#111722;--tx-hover:#151d29;--tx-line:#202936;--tx-line-bright:#2c3948;--tx-text:#f1f5f7;--tx-soft:#a7b0bc;--tx-muted:#8793a2;--tx-cyan:#26f4d0;position:fixed;inset:0;z-index:1000;background:rgba(0,0,0,.78);display:flex;align-items:center;justify-content:center;padding:20px;color:var(--tx-text);color-scheme:dark}
      .wms-tx-modal,.wms-tx-modal *{box-sizing:border-box}
      .wms-tx-modal.hidden{display:none}
      .wms-tx-modal-card{width:min(960px,100%);max-height:calc(100vh - 40px);overflow:auto;background:var(--tx-raised);color:var(--tx-text);border:1px solid var(--tx-line-bright);border-radius:15px;box-shadow:0 24px 80px rgba(0,0,0,.65)}
      .wms-tx-modal-header{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;padding:20px 22px;border-bottom:1px solid var(--tx-line);background:linear-gradient(90deg,rgba(38,244,208,.045),transparent 65%)}
      .wms-tx-modal-header h2{margin:0;color:var(--tx-text);font-size:17px;font-weight:800}
      .wms-tx-icon-button{width:31px;height:31px;border-radius:7px;border:1px solid var(--tx-line-bright);background:transparent;color:var(--tx-soft);font-size:20px;line-height:1;cursor:pointer}
      .wms-tx-icon-button:hover{color:var(--tx-cyan);border-color:var(--tx-cyan)}
      .wms-tx-form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:13px;padding:18px 22px 0}
      .wms-tx-field{display:flex;flex-direction:column;gap:6px;min-width:0}
      .wms-tx-field.full{grid-column:1/-1}
      .wms-tx-field>span{color:var(--tx-soft);font-size:9px;font-weight:700}
      .wms-tx-field input,.wms-tx-field select,.wms-tx-field textarea,.wms-tx-line input,.wms-tx-line select{width:100%;min-width:0;border:1px solid var(--tx-line-bright);border-radius:7px;background:var(--tx-bg);color:var(--tx-text);padding:9px 10px;font:500 10px Manrope,Arial,sans-serif;outline:none;color-scheme:dark}
      .wms-tx-field input::placeholder,.wms-tx-field textarea::placeholder,.wms-tx-line input::placeholder{color:#667282}
      .wms-tx-field input:focus,.wms-tx-field select:focus,.wms-tx-field textarea:focus,.wms-tx-line input:focus,.wms-tx-line select:focus{border-color:var(--tx-cyan);box-shadow:0 0 0 2px rgba(38,244,208,.08)}
      .wms-tx-field textarea{resize:vertical}
      .wms-tx-field input[readonly],.wms-tx-line input[readonly]{color:var(--tx-muted);background:#0a0e15}
      .wms-tx-detail-heading{display:flex;justify-content:space-between;align-items:center;gap:10px;margin:20px 22px 10px}
      .wms-tx-detail-heading h3{margin:0;color:var(--tx-text);font-size:12px}
      .wms-tx-detail-lines{padding:0 22px 18px;display:flex;flex-direction:column;gap:10px}
      .wms-tx-line{border:1px solid var(--tx-line);border-radius:10px;padding:12px;background:rgba(255,255,255,.018)}
      .wms-tx-line-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}
      .wms-tx-line-top strong{font-size:10px;color:var(--tx-text)}
      .wms-tx-line-grid{display:grid;grid-template-columns:2fr .8fr 1.2fr 1.2fr;gap:9px}
      .wms-tx-line-grid.two{grid-template-columns:repeat(2,minmax(0,1fr))}
      .wms-tx-line-grid.three{grid-template-columns:repeat(3,minmax(0,1fr))}
      .wms-tx-line-field{display:flex;flex-direction:column;gap:5px;min-width:0}
      .wms-tx-line-field>span{font-size:8px;color:var(--tx-muted);font-weight:700}
      .wms-tx-line-field small{font-size:8px;color:var(--tx-muted)}
      .wms-tx-line-meta{display:flex;gap:8px;flex-wrap:wrap;margin-top:9px}
      .wms-tx-line-meta .wms-tx-line-field{flex:1 1 145px}
      .wms-tx-remove-line{border:0;background:transparent;color:#ff7d8b;font-size:9px;font-weight:700;cursor:pointer}
      .wms-tx-modal-footer{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:15px 22px 19px;border-top:1px solid var(--tx-line);background:rgba(0,0,0,.10)}
      .wms-tx-save-actions{display:flex;justify-content:flex-end;gap:9px;flex-wrap:wrap}
      .wms-tx-view-content{padding:18px 22px;color:var(--tx-text)}
      .wms-tx-view-meta{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-bottom:17px}
      .wms-tx-view-meta div{padding:11px;border:1px solid var(--tx-line);border-radius:8px;background:rgba(255,255,255,.018)}
      .wms-tx-view-meta small{display:block;color:var(--tx-muted);font-size:8px;margin-bottom:5px}
      .wms-tx-view-meta strong{font-size:10px;color:var(--tx-text);overflow-wrap:anywhere}
      .wms-tx-view-notes{font-size:10px;color:var(--tx-soft);line-height:1.6;margin:8px 0 15px}
      .wms-tx-toast-stack{position:fixed;top:18px;right:18px;z-index:1200;display:flex;flex-direction:column;gap:8px;width:min(360px,calc(100vw - 36px));pointer-events:none}
      .wms-tx-toast{pointer-events:auto;display:flex;gap:10px;align-items:flex-start;padding:12px 14px;border-radius:9px;background:#10251e;border:1px solid #236246;border-left:4px solid #26b875;color:#d8f8e8;box-shadow:0 12px 30px rgba(0,0,0,.35);font-size:10px;line-height:1.5}
      .wms-tx-toast.warning{background:#2b2111;border-color:#72501e;border-left-color:#e5a33a;color:#ffe1ac}
      .wms-tx-toast.error{background:#2b1419;border-color:#75303d;border-left-color:#e05a6d;color:#ffd7dd}
      .wms-tx-toast button{margin-left:auto;border:0;background:transparent;color:inherit;font-size:15px;cursor:pointer}
      @media(max-width:900px){.wms-tx-page{padding:20px 16px 34px}.wms-tx-stats{grid-template-columns:repeat(2,minmax(0,1fr))}.wms-tx-panel-head{align-items:flex-start;flex-direction:column}.wms-tx-line-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
      @media(max-width:600px){.wms-tx-heading{align-items:flex-start;flex-direction:column}.wms-tx-heading h1{font-size:21px}.wms-tx-stats{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.wms-tx-stat{padding:12px}.wms-tx-stat strong{font-size:20px}.wms-tx-filters{width:100%}.wms-tx-filters select,.wms-tx-filters input{max-width:none;flex:1 1 130px}.wms-tx-form-grid{grid-template-columns:1fr;padding:15px}.wms-tx-field.full{grid-column:auto}.wms-tx-info{margin-left:15px;margin-right:15px}.wms-tx-detail-heading{margin:18px 15px 10px}.wms-tx-detail-lines{padding:0 15px 15px}.wms-tx-line-grid,.wms-tx-line-grid.two,.wms-tx-line-grid.three{grid-template-columns:1fr 1fr}.wms-tx-view-meta{grid-template-columns:1fr 1fr}.wms-tx-modal{padding:8px}.wms-tx-modal-card{max-height:calc(100vh - 16px)}.wms-tx-modal-header,.wms-tx-modal-footer{padding-left:15px;padding-right:15px}}
    `;
    document.head.appendChild(style);

  }


  function bindTransactionsPageEvents() {

    document.getElementById("tx-refresh").addEventListener("click", function() {
      loadTransactionsCatalog(true);
    });

    document.getElementById("tx-new").addEventListener("click", openCreateTransactionModal);

    document.getElementById("tx-filter-type").addEventListener("change", renderTransactionTable);
    document.getElementById("tx-filter-status").addEventListener("change", renderTransactionTable);
    document.getElementById("tx-search").addEventListener("input", renderTransactionTable);

    document.getElementById("tx-form-type").addEventListener("change", function() {
      updateTransactionFormType();
      renderTransactionLines();
    });

    document.getElementById("tx-add-line").addEventListener("click", addTransactionLine);
    document.getElementById("tx-create-form").addEventListener("submit", function(event) {
      saveTransaction(event, "DRAFT");
    });
    document.getElementById("tx-save-draft").addEventListener("click", function() {
      saveTransaction(null, "DRAFT");
    });
    document.getElementById("tx-save-post").addEventListener("click", function() {
      saveTransaction(null, "POST");
    });

    document.getElementById("tx-close-modal").addEventListener("click", closeCreateTransactionModal);
    document.getElementById("tx-cancel-create").addEventListener("click", closeCreateTransactionModal);

    document.getElementById("tx-close-view").addEventListener("click", closeTransactionViewModal);

    document.getElementById("tx-detail-lines").addEventListener("change", handleTransactionLineChange);
    document.getElementById("tx-detail-lines").addEventListener("input", handleTransactionLineChange);

    document.getElementById("tx-create-modal").addEventListener("click", function(event) {
      if (event.target.id === "tx-create-modal") closeCreateTransactionModal();
    });

    document.getElementById("tx-view-modal").addEventListener("click", function(event) {
      if (event.target.id === "tx-view-modal") closeTransactionViewModal();
    });

  }


  function loadTransactionsCatalog(showRefreshToast) {

    const requestId = ++transactionUiState.requestId;
    const loading = document.getElementById("tx-loading");
    const refreshButton = document.getElementById("tx-refresh");
    const error = document.getElementById("tx-error");

    if (loading) {
      loading.textContent = "Memuat data transaksi dan saldo...";
      loading.classList.remove("hidden");
    }

    if (refreshButton) {
      refreshButton.disabled = true;
      refreshButton.textContent = "Loading...";
    }

    if (error) {
      error.textContent = "";
      error.classList.add("hidden");
    }

    google.script.run
      .withSuccessHandler(function(result) {

        if (currentPage !== "transactions" || requestId !== transactionUiState.requestId) return;

        if (!result || !result.ok) {
          finishTransactionLoading();
          showTransactionsError("Respons Inventory tidak valid.");
          return;
        }

        transactionUiState.catalog = result;

        // Fetch friendly UOM labels without changing the Inventory backend schema.
        google.script.run
          .withSuccessHandler(function(masterResult) {

            if (currentPage !== "transactions" || requestId !== transactionUiState.requestId) return;

            transactionUiState.uomById = {};
            const uoms = masterResult && Array.isArray(masterResult.uoms)
              ? masterResult.uoms
              : [];

            uoms.forEach(function(uom) {
              transactionUiState.uomById[String(uom.uom_id || "")] =
                String(uom.uom_name || uom.uom_code || uom.uom_id || "");
            });

            finishTransactionLoading();
            renderTransactionStats();
            renderTransactionTable();
            renderTransactionBalances();

            if (showRefreshToast) {
              showTransactionToast("Data transaksi dan saldo berhasil diperbarui.", "success");
            }

          })
          .withFailureHandler(function() {

            if (currentPage !== "transactions" || requestId !== transactionUiState.requestId) return;

            transactionUiState.uomById = {};
            finishTransactionLoading();
            renderTransactionStats();
            renderTransactionTable();
            renderTransactionBalances();

            if (showRefreshToast) {
              showTransactionToast("Data transaksi diperbarui. Nama UOM tidak dapat dimuat.", "warning");
            }

          })
          .getMasterDataCatalog();

      })
      .withFailureHandler(function(errorObject) {

        if (currentPage !== "transactions" || requestId !== transactionUiState.requestId) return;

        finishTransactionLoading();
        showTransactionsError(getAppErrorMessage(errorObject));

      })
      .getInventoryFoundationCatalog();

  }


  function finishTransactionLoading() {

    const loading = document.getElementById("tx-loading");
    const refreshButton = document.getElementById("tx-refresh");

    if (loading) loading.classList.add("hidden");

    if (refreshButton) {
      refreshButton.disabled = false;
      refreshButton.textContent = "↻ Refresh";
    }

  }


  function renderTransactionStats() {

    const catalog = transactionUiState.catalog || {};
    const transactions = Array.isArray(catalog.recentTransactions) ? catalog.recentTransactions : [];
    const balances = Array.isArray(catalog.balances) ? catalog.balances : [];

    const draftCount = transactions.filter(function(row) {
      return String(row.transaction_status || "").toUpperCase() === "DRAFT";
    }).length;

    const postedCount = transactions.filter(function(row) {
      return String(row.transaction_status || "").toUpperCase() === "POSTED";
    }).length;

    const totalQuantity = balances.reduce(function(total, row) {
      return total + (Number(row.quantity_on_hand) || 0);
    }, 0);

    setTextIfExists("tx-stat-draft", draftCount.toLocaleString("id-ID"));
    setTextIfExists("tx-stat-posted", postedCount.toLocaleString("id-ID"));
    setTextIfExists("tx-stat-balances", balances.length.toLocaleString("id-ID"));
    setTextIfExists("tx-stat-quantity", formatTransactionNumber(totalQuantity));

  }


  function renderTransactionTable() {

    const body = document.getElementById("tx-table-body");
    if (!body) return;

    body.replaceChildren();

    const catalog = transactionUiState.catalog || {};
    const transactions = Array.isArray(catalog.recentTransactions) ? catalog.recentTransactions : [];

    const typeFilter = document.getElementById("tx-filter-type").value;
    const statusFilter = document.getElementById("tx-filter-status").value;
    const query = String(document.getElementById("tx-search").value || "").trim().toLowerCase();

    const filtered = transactions.filter(function(row) {

      const type = String(row.transaction_type || "").toUpperCase();
      const status = String(row.transaction_status || "").toUpperCase();

      if (typeFilter !== "ALL" && type !== typeFilter) return false;
      if (statusFilter !== "ALL" && status !== statusFilter) return false;

      const haystack = [
        row.transaction_no,
        row.transaction_type,
        row.transaction_status,
        row.reference_no,
        row.purpose,
        row.transaction_date
      ].join(" ").toLowerCase();

      return !query || haystack.indexOf(query) >= 0;

    });

    if (!filtered.length) {
      const row = document.createElement("tr");
      const cell = document.createElement("td");
      cell.colSpan = 7;
      cell.className = "wms-tx-empty";
      cell.textContent = transactions.length
        ? "Tidak ada transaksi yang cocok dengan filter."
        : "Belum ada transaksi. Gunakan New Transaction untuk membuat draft pertama.";
      row.appendChild(cell);
      body.appendChild(row);
      return;
    }

    filtered.forEach(function(transaction) {

      const row = document.createElement("tr");

      const noCell = document.createElement("td");
      const no = document.createElement("strong");
      no.textContent = transaction.transaction_no || "-";
      noCell.appendChild(no);
      row.appendChild(noCell);

      appendTextCell(row, transaction.transaction_date);
      appendTextCell(row, transactionTypeLabels[String(transaction.transaction_type || "").toUpperCase()] || transaction.transaction_type);
      appendTextCell(row, transaction.reference_no);
      appendTextCell(row, transaction.purpose);

      const statusCell = document.createElement("td");
      const status = String(transaction.transaction_status || "").toUpperCase();
      const badge = document.createElement("span");
      badge.className = "wms-tx-status " + status;
      badge.textContent = status || "-";
      statusCell.appendChild(badge);
      row.appendChild(statusCell);

      const actionCell = document.createElement("td");
      const viewButton = document.createElement("button");
      viewButton.type = "button";
      viewButton.className = "wms-tx-row-action";
      viewButton.textContent = "Details";
      viewButton.addEventListener("click", function() {
        openTransactionDetails(transaction.transaction_id);
      });
      actionCell.appendChild(viewButton);
      row.appendChild(actionCell);

      body.appendChild(row);

    });

  }


  function renderTransactionBalances() {

    const body = document.getElementById("tx-balance-body");
    if (!body) return;

    body.replaceChildren();

    const catalog = transactionUiState.catalog || {};
    const balances = Array.isArray(catalog.balances) ? catalog.balances : [];

    if (!balances.length) {
      const row = document.createElement("tr");
      const cell = document.createElement("td");
      cell.colSpan = 6;
      cell.className = "wms-tx-empty";
      cell.textContent = "Belum ada saldo stok. Posting Receiving atau transaksi penambahan terlebih dahulu.";
      row.appendChild(cell);
      body.appendChild(row);
      return;
    }

    balances.forEach(function(balance) {

      const row = document.createElement("tr");
      appendTextCell(row, balance.item_code);
      appendTextCell(row, balance.item_name);
      appendTextCell(row, balance.location_name);
      appendTextCell(row, stockStatusLabels[String(balance.stock_status || "").toUpperCase()] || balance.stock_status);
      const quantityCell = document.createElement("td");
      quantityCell.className = "number";
      const strong = document.createElement("strong");
      strong.textContent = formatTransactionNumber(balance.quantity_on_hand);
      quantityCell.appendChild(strong);
      row.appendChild(quantityCell);
      appendTextCell(row, balance.updated_at);
      body.appendChild(row);

    });

  }


  function openCreateTransactionModal() {

    const catalog = transactionUiState.catalog || {};
    const items = Array.isArray(catalog.items) ? catalog.items : [];
    const locations = Array.isArray(catalog.locations) ? catalog.locations : [];
    const persons = Array.isArray(catalog.persons) ? catalog.persons : [];

    if (!items.length) {
      showTransactionToast("Belum ada Item aktif dengan Quantity Tracking. Tambahkan atau aktifkan Item Consumable terlebih dahulu.", "warning");
      return;
    }

    if (!locations.length) {
      showTransactionToast("Belum ada Location aktif yang mengizinkan Quantity Stock dan Transactions.", "warning");
      return;
    }

    transactionUiState.lines = [];
    transactionUiState.nextLineId = 1;

    const form = document.getElementById("tx-create-form");
    form.reset();

    document.getElementById("tx-form-date").value = getTodayIsoDate();
    document.getElementById("tx-form-type").value = "RECEIVING";
    document.getElementById("tx-form-purpose").value = "Penerimaan barang dari Gudang Pusat";
    document.getElementById("tx-form-issue-mode").value = "";

    populateTransactionPersonSelect("tx-form-requester", persons);
    populateTransactionPersonSelect("tx-form-receiver", persons);

    hideTransactionFormError();
    updateTransactionFormType();

    addTransactionLine();

    document.getElementById("tx-create-modal").classList.remove("hidden");

  }


  function populateTransactionPersonSelect(elementId, persons) {

    const select = document.getElementById(elementId);
    if (!select) return;

    select.replaceChildren();

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "-- Optional --";
    select.appendChild(placeholder);

    persons.forEach(function(person) {
      const option = document.createElement("option");
      option.value = person.person_id;
      option.textContent = [
        person.employee_id,
        person.person_name,
        person.department_name
      ].filter(Boolean).join(" · ");
      select.appendChild(option);
    });

  }


  function updateTransactionFormType() {

    const type = document.getElementById("tx-form-type").value;
    const issueWrap = document.getElementById("tx-issue-mode-wrap");
    const sourceHint = document.getElementById("tx-central-source-hint");

    if (issueWrap) {
      issueWrap.classList.toggle("hidden", type !== "ISSUE");
    }

    if (sourceHint) {
      sourceHint.classList.toggle("hidden", type !== "RECEIVING");
    }

    const purpose = document.getElementById("tx-form-purpose");
    if (type === "RECEIVING" && !purpose.value.trim()) {
      purpose.value = "Penerimaan barang dari Gudang Pusat";
    }

    if (type === "ISSUE" && purpose.value === "Penerimaan barang dari Gudang Pusat") {
      purpose.value = "";
    }

  }


  function addTransactionLine() {

    if (transactionUiState.lines.length >= 200) {
      showTransactionFormError("Maksimal 200 baris item per transaksi.");
      return;
    }

    transactionUiState.lines.push({
      id: transactionUiState.nextLineId++,
      item_id: "",
      quantity: "",
      adjustment_direction: "ADD",
      from_location_id: "",
      to_location_id: "",
      from_stock_status: "AVAILABLE",
      to_stock_status: "AVAILABLE",
      condition_status: "",
      unit_cost: ""
    });

    renderTransactionLines();

  }


  function removeTransactionLine(lineId) {

    if (transactionUiState.lines.length <= 1) {
      showTransactionFormError("Transaksi harus memiliki minimal satu baris item.");
      return;
    }

    transactionUiState.lines = transactionUiState.lines.filter(function(line) {
      return line.id !== lineId;
    });

    renderTransactionLines();

  }


  function renderTransactionLines() {

    const container = document.getElementById("tx-detail-lines");
    if (!container) return;

    const type = document.getElementById("tx-form-type").value;
    const catalog = transactionUiState.catalog || {};
    const items = Array.isArray(catalog.items) ? catalog.items : [];

    container.replaceChildren();

    transactionUiState.lines.forEach(function(line, index) {

      const itemOptions = items.map(function(item) {
        const selected = String(item.item_id) === String(line.item_id) ? " selected" : "";
        return `<option value="${escapeTransactionHtml(item.item_id)}"${selected}>${escapeTransactionHtml(item.item_code + " · " + item.item_name)}</option>`;
      }).join("");

      const item = items.find(function(candidate) {
        return String(candidate.item_id) === String(line.item_id);
      });

      const uomName = item
        ? (transactionUiState.uomById[item.base_uom_id] || "Base UOM")
        : "Pilih item terlebih dahulu";

      const locationControls = buildTransactionLocationControls(line, type);
      const statusControls = buildTransactionStatusControls(line, type);

      const wrapper = document.createElement("div");
      wrapper.className = "wms-tx-line";
      wrapper.dataset.lineId = line.id;

      wrapper.innerHTML = `
        <div class="wms-tx-line-top">
          <strong>Item Line ${index + 1}</strong>
          <button type="button" class="wms-tx-remove-line" data-remove-line="${line.id}">Remove</button>
        </div>

        <div class="wms-tx-line-grid three">
          <label class="wms-tx-line-field">
            <span>Item *</span>
            <select data-line-field="item_id" required>
              <option value="">-- Select Item --</option>
              ${itemOptions}
            </select>
          </label>
          <label class="wms-tx-line-field">
            <span>Quantity *</span>
            <input data-line-field="quantity" type="number" min="0.000001" step="any" required value="${escapeTransactionHtml(line.quantity)}" placeholder="0">
          </label>
          <div class="wms-tx-line-field">
            <span>Base UOM</span>
            <input type="text" readonly value="${escapeTransactionHtml(uomName)}">
          </div>
        </div>

        <div class="wms-tx-line-grid ${type === "TRANSFER" ? "three" : "two"}" style="margin-top:9px">
          ${locationControls}
          ${statusControls}
        </div>

        <div class="wms-tx-line-meta">
          <label class="wms-tx-line-field">
            <span>Condition Status</span>
            <input data-line-field="condition_status" type="text" maxlength="60" value="${escapeTransactionHtml(line.condition_status)}" placeholder="Contoh: GOOD / DAMAGED">
          </label>
          <label class="wms-tx-line-field">
            <span>Unit Cost (optional)</span>
            <input data-line-field="unit_cost" type="number" min="0" step="any" value="${escapeTransactionHtml(line.unit_cost)}" placeholder="0">
          </label>
        </div>
      `;

      container.appendChild(wrapper);

    });

    container.querySelectorAll("[data-remove-line]").forEach(function(button) {
      button.addEventListener("click", function() {
        removeTransactionLine(Number(button.dataset.removeLine));
      });
    });

  }


  function buildTransactionLocationControls(line, type) {

    const locations = transactionUiState.catalog && Array.isArray(transactionUiState.catalog.locations)
      ? transactionUiState.catalog.locations
      : [];

    const makeSelect = function(field, label, selectedId) {
      const options = locations.map(function(location) {
        const selected = location.location_id === selectedId ? " selected" : "";
        return `<option value="${escapeTransactionHtml(location.location_id)}"${selected}>${escapeTransactionHtml(location.location_code + " · " + location.location_name)}</option>`;
      }).join("");

      return `
        <label class="wms-tx-line-field">
          <span>${label} *</span>
          <select data-line-field="${field}" required>
            <option value="">-- Select Location --</option>
            ${options}
          </select>
        </label>
      `;
    };

    if (type === "RECEIVING" || type === "RETURN") {
      return makeSelect("to_location_id", "To Location", line.to_location_id);
    }

    if (type === "ISSUE") {
      return makeSelect("from_location_id", "From Location", line.from_location_id);
    }

    if (type === "TRANSFER") {
      return makeSelect("from_location_id", "From Location", line.from_location_id) +
        makeSelect("to_location_id", "To Location", line.to_location_id);
    }

    const directionOptions = `
      <label class="wms-tx-line-field">
        <span>Adjustment Direction *</span>
        <select data-line-field="adjustment_direction">
          <option value="ADD"${line.adjustment_direction === "ADD" ? " selected" : ""}>Increase (+)</option>
          <option value="REMOVE"${line.adjustment_direction === "REMOVE" ? " selected" : ""}>Decrease (−)</option>
        </select>
      </label>
    `;

    return directionOptions + makeSelect(
      "adjustment_location_id",
      "Location",
      line.adjustment_direction === "REMOVE" ? line.from_location_id : line.to_location_id
    );

  }


  function buildTransactionStatusControls(line, type) {

    const options = Object.keys(stockStatusLabels).map(function(status) {
      return {value:status,label:stockStatusLabels[status]};
    });

    const makeSelect = function(field, label, selectedValue) {
      return `
        <label class="wms-tx-line-field">
          <span>${label}</span>
          <select data-line-field="${field}">
            ${options.map(function(option) {
              return `<option value="${option.value}"${option.value === selectedValue ? " selected" : ""}>${option.label}</option>`;
            }).join("")}
          </select>
        </label>
      `;
    };

    if (type === "ISSUE") {
      return `
        <div class="wms-tx-line-field">
          <span>From Stock Status</span>
          <input type="text" readonly value="Available">
          <small>Issue hanya mengurangi stok AVAILABLE.</small>
        </div>
      `;
    }

    if (type === "TRANSFER") {
      return makeSelect("from_stock_status", "From Status", line.from_stock_status) +
        makeSelect("to_stock_status", "To Status", line.to_stock_status);
    }

    if (type === "ADJUSTMENT") {
      const selected = line.adjustment_direction === "REMOVE"
        ? line.from_stock_status
        : line.to_stock_status;
      const field = line.adjustment_direction === "REMOVE"
        ? "from_stock_status"
        : "to_stock_status";
      return makeSelect(field, "Stock Status", selected);
    }

    return makeSelect("to_stock_status", "To Stock Status", line.to_stock_status);

  }


  function handleTransactionLineChange(event) {

    const target = event.target;
    const row = target.closest(".wms-tx-line");
    if (!row || !target.dataset.lineField) return;

    const lineId = Number(row.dataset.lineId);
    const line = transactionUiState.lines.find(function(item) {
      return item.id === lineId;
    });

    if (!line) return;

    const field = target.dataset.lineField;
    line[field] = target.value;

    if (field === "adjustment_direction") {
      line.from_location_id = "";
      line.to_location_id = "";
      line.from_stock_status = "AVAILABLE";
      line.to_stock_status = "AVAILABLE";
      renderTransactionLines();
      return;
    }

    if (field === "adjustment_location_id") {
      if (line.adjustment_direction === "REMOVE") {
        line.from_location_id = target.value;
        line.to_location_id = "";
      } else {
        line.to_location_id = target.value;
        line.from_location_id = "";
      }
      return;
    }

    if (field === "item_id") {
      const item = (transactionUiState.catalog.items || []).find(function(candidate) {
        return candidate.item_id === target.value;
      });
      renderTransactionLines();
      return;
    }

    hideTransactionFormError();

  }


  function saveTransaction(event, action) {

    if (event && typeof event.preventDefault === "function") {
      event.preventDefault();
    }

    if (transactionUiState.saving) return;

    action = action === "POST" ? "POST" : "DRAFT";

    const form = document.getElementById("tx-create-form");
    if (!form.reportValidity()) return;

    if (action === "POST" && !window.confirm(
      "Save & Post akan langsung memperbarui Inventory Ledger dan Inventory Balance. Pastikan item, quantity, dan lokasi sudah benar. Lanjutkan?"
    )) {
      return;
    }

    const type = document.getElementById("tx-form-type").value;
    const details = [];

    for (let i = 0; i < transactionUiState.lines.length; i++) {

      const line = transactionUiState.lines[i];
      const lineElement = document.querySelector(
        '#tx-detail-lines .wms-tx-line[data-line-id="' + line.id + '"]'
      );

      if (!lineElement) continue;

      const fieldValue = function(name) {
        const element = lineElement.querySelector('[data-line-field="' + name + '"]');
        return element ? element.value : "";
      };

      line.item_id = fieldValue("item_id");
      line.quantity = fieldValue("quantity");
      line.condition_status = fieldValue("condition_status");
      line.unit_cost = fieldValue("unit_cost");

      const item = (transactionUiState.catalog.items || []).find(function(candidate) {
        return candidate.item_id === line.item_id;
      });

      if (!item) {
        showTransactionFormError("Item pada baris " + (i + 1) + " belum dipilih.");
        return;
      }

      const detail = {
        item_id: line.item_id,
        quantity: line.quantity,
        uom_id: item.base_uom_id,
        condition_status: line.condition_status,
        unit_cost: line.unit_cost
      };

      if (type === "RECEIVING" || type === "RETURN") {
        detail.to_location_id = fieldValue("to_location_id");
        detail.to_stock_status = fieldValue("to_stock_status") || "AVAILABLE";
      } else if (type === "ISSUE") {
        detail.from_location_id = fieldValue("from_location_id");
        detail.from_stock_status = "AVAILABLE";
      } else if (type === "TRANSFER") {
        detail.from_location_id = fieldValue("from_location_id");
        detail.to_location_id = fieldValue("to_location_id");
        detail.from_stock_status = fieldValue("from_stock_status") || "AVAILABLE";
        detail.to_stock_status = fieldValue("to_stock_status") || detail.from_stock_status;
      } else if (type === "ADJUSTMENT") {
        const direction = fieldValue("adjustment_direction") || line.adjustment_direction;
        const locationId = fieldValue("adjustment_location_id");
        if (direction === "REMOVE") {
          detail.from_location_id = locationId;
          detail.from_stock_status = fieldValue("from_stock_status") || "AVAILABLE";
        } else {
          detail.to_location_id = locationId;
          detail.to_stock_status = fieldValue("to_stock_status") || "AVAILABLE";
        }
      }

      details.push(detail);

    }

    const payload = {
      transaction_type: type,
      transaction_date: document.getElementById("tx-form-date").value,
      issue_mode: document.getElementById("tx-form-issue-mode").value,
      requester_person_id: document.getElementById("tx-form-requester").value,
      receiver_person_id: document.getElementById("tx-form-receiver").value,
      reference_no: document.getElementById("tx-form-reference").value,
      purpose: document.getElementById("tx-form-purpose").value,
      notes: document.getElementById("tx-form-notes").value,
      details: details
    };

    if (type === "ADJUSTMENT" && !payload.purpose.trim() && !payload.notes.trim()) {
      showTransactionFormError("Stock Adjustment wajib memiliki Purpose atau Notes sebagai alasan.");
      return;
    }

    hideTransactionFormError();
    setTransactionDraftSaving(true, action === "POST" ? "CREATE_FOR_POST" : "DRAFT");

    google.script.run
      .withSuccessHandler(function(result) {

        if (!result || !result.ok || !result.transaction_id) {
          setTransactionDraftSaving(false);
          showTransactionFormError("Draft gagal disimpan. Periksa kembali data transaksi.");
          return;
        }

        if (action === "DRAFT") {
          setTransactionDraftSaving(false);
          closeCreateTransactionModal();
          showTransactionToast(
            result.message || "Draft transaksi berhasil dibuat.",
            result.auditLogged === false ? "warning" : "success"
          );
          loadTransactionsCatalog(false);
          return;
        }

        // Save & Post uses the same protected backend sequence:
        // create a DRAFT first, then post that exact transaction ID.
        setTransactionDraftSaving(true, "POST");

        google.script.run
          .withSuccessHandler(function(postResult) {

            setTransactionDraftSaving(false);
            closeCreateTransactionModal();

            if (!postResult || !postResult.ok) {
              showTransactionToast(
                "Draft " + (result.transaction_no || "transaksi") +
                " berhasil disimpan, tetapi belum berhasil diposting. Buka Details untuk mencoba posting kembali.",
                "warning"
              );
              loadTransactionsCatalog(false);
              return;
            }

            const auditWarning = result.auditLogged === false || postResult.auditLogged === false;
            showTransactionToast(
              postResult.message || ("Transaksi " + (result.transaction_no || "") + " berhasil disimpan dan diposting."),
              auditWarning ? "warning" : "success"
            );
            loadTransactionsCatalog(false);

          })
          .withFailureHandler(function(postError) {

            setTransactionDraftSaving(false);
            closeCreateTransactionModal();
            showTransactionToast(
              "Draft " + (result.transaction_no || "transaksi") +
              " berhasil disimpan, tetapi posting belum selesai: " +
              getAppErrorMessage(postError) +
              " Buka Details untuk mencoba posting kembali.",
              "warning"
            );
            loadTransactionsCatalog(false);

          })
          .postInventoryTransaction({id: result.transaction_id});

      })
      .withFailureHandler(function(errorObject) {

        setTransactionDraftSaving(false);
        showTransactionFormError(getAppErrorMessage(errorObject));

      })
      .createInventoryDraft(payload);

  }


  function setTransactionDraftSaving(isSaving, stage) {

    transactionUiState.saving = Boolean(isSaving);

    const draftButton = document.getElementById("tx-save-draft");
    const postButton = document.getElementById("tx-save-post");
    const closeButton = document.getElementById("tx-close-modal");
    const cancelButton = document.getElementById("tx-cancel-create");

    if (draftButton) {
      draftButton.disabled = isSaving;
      draftButton.textContent = isSaving && stage === "DRAFT" ? "Saving..." : "Save Draft";
    }

    if (postButton) {
      postButton.disabled = isSaving;
      postButton.textContent = isSaving && (stage === "CREATE_FOR_POST" || stage === "POST")
        ? (stage === "POST" ? "Posting..." : "Saving Draft...")
        : "Save & Post";
    }

    if (closeButton) closeButton.disabled = isSaving;
    if (cancelButton) cancelButton.disabled = isSaving;

  }


  function closeCreateTransactionModal() {

    const modal = document.getElementById("tx-create-modal");
    if (!modal) return;

    if (transactionUiState.saving) return;

    modal.classList.add("hidden");
    hideTransactionFormError();

  }


  function showTransactionFormError(message) {

    const error = document.getElementById("tx-form-error");
    if (!error) return;

    error.textContent = message;
    error.className = "wms-tx-alert error";

  }


  function hideTransactionFormError() {

    const error = document.getElementById("tx-form-error");
    if (!error) return;

    error.textContent = "";
    error.classList.add("hidden");

  }


  function openTransactionDetails(transactionId) {

    const modal = document.getElementById("tx-view-modal");
    const content = document.getElementById("tx-view-content");
    const actions = document.getElementById("tx-view-actions");
    const error = document.getElementById("tx-view-error");

    content.innerHTML = '<div class="wms-tx-loading">Memuat detail transaksi...</div>';
    actions.replaceChildren();
    error.classList.add("hidden");
    modal.classList.remove("hidden");

    google.script.run
      .withSuccessHandler(function(result) {

        if (!result || !result.ok) {
          showTransactionViewError("Detail transaksi tidak valid.");
          return;
        }

        transactionUiState.activeDetail = result;
        renderTransactionDetailView(result);

      })
      .withFailureHandler(function(errorObject) {
        showTransactionViewError(getAppErrorMessage(errorObject));
      })
      .getInventoryTransaction({id: transactionId});

  }


  function renderTransactionDetailView(result) {

    const transaction = result.transaction || {};
    const details = Array.isArray(result.details) ? result.details : [];
    const catalog = transactionUiState.catalog || {};
    const itemMap = {};
    const locationMap = {};

    (catalog.items || []).forEach(function(item) {
      itemMap[item.item_id] = item;
    });

    (catalog.locations || []).forEach(function(location) {
      locationMap[location.location_id] = location;
    });

    setTextIfExists(
      "tx-view-title",
      transaction.transaction_no || "Transaction Detail"
    );

    setTextIfExists(
      "tx-view-subtitle",
      (transactionTypeLabels[transaction.transaction_type] || transaction.transaction_type) +
      " · " + (transaction.transaction_date || "")
    );

    const status = String(transaction.transaction_status || "").toUpperCase();

    const meta = document.createElement("div");
    meta.className = "wms-tx-view-meta";
    [
      ["Transaction Type", transactionTypeLabels[transaction.transaction_type] || transaction.transaction_type],
      ["Status", status],
      ["Reference No.", transaction.reference_no],
      ["Requester", findPersonLabel(transaction.requester_person_id)],
      ["Receiver", findPersonLabel(transaction.receiver_person_id)],
      ["Purpose", transaction.purpose]
    ].forEach(function(entry) {
      const box = document.createElement("div");
      const label = document.createElement("small");
      label.textContent = entry[0];
      const value = document.createElement("strong");
      value.textContent = entry[1] || "-";
      box.appendChild(label);
      box.appendChild(value);
      meta.appendChild(box);
    });

    const notes = document.createElement("p");
    notes.className = "wms-tx-view-notes";
    notes.textContent = transaction.notes ? "Notes: " + transaction.notes : "";

    const tableWrap = document.createElement("div");
    tableWrap.className = "wms-tx-table-wrap";

    const table = document.createElement("table");
    table.className = "wms-tx-table";
    table.innerHTML = `
      <thead><tr>
        <th>Line</th><th>Item</th><th>Quantity</th><th>From</th><th>To</th><th>Stock Status</th><th>Unit Cost</th>
      </tr></thead>
      <tbody></tbody>
    `;

    const tbody = table.querySelector("tbody");

    details.forEach(function(detail) {

      const row = document.createElement("tr");
      const item = itemMap[detail.item_id];
      const fromLocation = locationMap[detail.from_location_id];
      const toLocation = locationMap[detail.to_location_id];
      const uom = transactionUiState.uomById[detail.uom_id] || "";

      appendTextCell(row, detail.line_no);
      appendTextCell(row, item ? item.item_code + " · " + item.item_name : detail.item_id);
      appendTextCell(row, formatTransactionNumber(detail.quantity) + (uom ? " " + uom : ""));
      appendTextCell(row, fromLocation ? fromLocation.location_code + " · " + fromLocation.location_name : "-");
      appendTextCell(row, toLocation ? toLocation.location_code + " · " + toLocation.location_name : "-");
      appendTextCell(row, [
        detail.from_stock_status && detail.from_location_id ? "From: " + (stockStatusLabels[detail.from_stock_status] || detail.from_stock_status) : "",
        detail.to_stock_status && detail.to_location_id ? "To: " + (stockStatusLabels[detail.to_stock_status] || detail.to_stock_status) : ""
      ].filter(Boolean).join(" / ") || "-");
      appendTextCell(row, detail.unit_cost === "" ? "-" : formatTransactionNumber(detail.unit_cost));
      tbody.appendChild(row);

    });

    tableWrap.appendChild(table);

    const content = document.getElementById("tx-view-content");
    content.replaceChildren(meta);
    if (notes.textContent) content.appendChild(notes);
    content.appendChild(tableWrap);

    const actions = document.getElementById("tx-view-actions");
    actions.replaceChildren();

    const closeButton = makeTransactionButton("Close", "secondary", closeTransactionViewModal);
    actions.appendChild(closeButton);

    if (status === "DRAFT" || status === "POSTING") {
      const postButton = makeTransactionButton(
        status === "POSTING" ? "Retry Posting" : "Post Transaction",
        "primary",
        function() { postTransactionFromView(transaction.transaction_id); }
      );
      actions.appendChild(postButton);
    }

    if (status === "DRAFT") {
      const cancelButton = makeTransactionButton(
        "Cancel Draft",
        "danger",
        function() { cancelTransactionFromView(transaction.transaction_id); }
      );
      actions.appendChild(cancelButton);
    }

  }


  function makeTransactionButton(label, variant, callback) {

    const button = document.createElement("button");
    button.type = "button";
    button.className = "wms-tx-button " + (variant === "danger" ? "secondary" : variant);
    if (variant === "danger") {
      button.style.color = "#ff7d8b";
      button.style.borderColor = "rgba(255,100,116,.4)";
    }
    button.textContent = label;
    button.addEventListener("click", callback);
    return button;

  }


  function postTransactionFromView(transactionId) {

    if (!confirm("Posting transaksi akan memperbarui Inventory Ledger dan Inventory Balance. Lanjutkan?")) {
      return;
    }

    setTransactionViewActionBusy(true);

    google.script.run
      .withSuccessHandler(function(result) {

        setTransactionViewActionBusy(false);

        if (!result || !result.ok) {
          showTransactionViewError("Posting transaksi tidak berhasil.");
          return;
        }

        closeTransactionViewModal();

        const message = result.message || "Transaksi berhasil diposting.";
        showTransactionToast(
          result.auditLogged === false ? message + " Audit Log gagal ditulis." : message,
          result.auditLogged === false ? "warning" : "success"
        );

        loadTransactionsCatalog(false);

      })
      .withFailureHandler(function(errorObject) {

        setTransactionViewActionBusy(false);
        showTransactionViewError(getAppErrorMessage(errorObject));

      })
      .postInventoryTransaction({id: transactionId});

  }


  function cancelTransactionFromView(transactionId) {

    if (!confirm("Batalkan draft transaksi ini? Draft yang dibatalkan tidak dapat diposting.")) {
      return;
    }

    setTransactionViewActionBusy(true);

    google.script.run
      .withSuccessHandler(function(result) {

        setTransactionViewActionBusy(false);

        if (!result || !result.ok) {
          showTransactionViewError("Draft gagal dibatalkan.");
          return;
        }

        closeTransactionViewModal();

        showTransactionToast(
          result.message || "Draft berhasil dibatalkan.",
          result.auditLogged === false ? "warning" : "success"
        );

        loadTransactionsCatalog(false);

      })
      .withFailureHandler(function(errorObject) {

        setTransactionViewActionBusy(false);
        showTransactionViewError(getAppErrorMessage(errorObject));

      })
      .cancelInventoryTransaction({id: transactionId});

  }


  function setTransactionViewActionBusy(isBusy) {

    const buttons = document.querySelectorAll("#tx-view-actions button");
    buttons.forEach(function(button) {
      button.disabled = isBusy;
    });

  }


  function showTransactionViewError(message) {

    const error = document.getElementById("tx-view-error");
    if (!error) return;

    error.textContent = message;
    error.className = "wms-tx-alert error";

  }


  function closeTransactionViewModal() {

    const modal = document.getElementById("tx-view-modal");
    if (modal) modal.classList.add("hidden");

    transactionUiState.activeDetail = null;

  }


  function findPersonLabel(personId) {

    if (!personId) return "-";

    const persons = transactionUiState.catalog && transactionUiState.catalog.persons
      ? transactionUiState.catalog.persons
      : [];

    const person = persons.find(function(row) {
      return row.person_id === personId;
    });

    return person
      ? [person.employee_id, person.person_name].filter(Boolean).join(" · ")
      : personId;

  }


  function showTransactionsError(message) {

    const error = document.getElementById("tx-error");
    if (!error) return;

    error.textContent = message;
    error.className = "wms-tx-alert error";

  }


  function showTransactionToast(message, type) {

    const stack = document.getElementById("wms-tx-toast-stack");
    if (!stack) return;

    const toast = document.createElement("div");
    toast.className = "wms-tx-toast" + (
      type === "warning" ? " warning" :
      type === "error" ? " error" : ""
    );

    const text = document.createElement("span");
    text.textContent = String(message || "Proses berhasil.");

    const close = document.createElement("button");
    close.type = "button";
    close.setAttribute("aria-label", "Close notification");
    close.textContent = "×";

    let timer = null;
    const remove = function() {
      window.clearTimeout(timer);
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    };

    close.addEventListener("click", remove);
    toast.appendChild(text);
    toast.appendChild(close);
    stack.appendChild(toast);

    timer = window.setTimeout(remove, 3800);

  }


  function escapeTransactionHtml(value) {

    return String(value === null || value === undefined ? "" : value)
      .replace(/[&<>"']/g, function(character) {
        return {
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#039;"
        }[character];
      });

  }


  function formatTransactionNumber(value) {

    const number = Number(value);
    if (!Number.isFinite(number)) return "0";

    return number.toLocaleString("id-ID", {
      maximumFractionDigits: 4
    });

  }


  function getTodayIsoDate() {

    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Jakarta",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).formatToParts(new Date());

    const values = {};
    parts.forEach(function(part) {
      values[part.type] = part.value;
    });

    return values.year + "-" + values.month + "-" + values.day;

  }


  function setTextIfExists(elementId, value) {

    const element = document.getElementById(elementId);
    if (element) element.textContent = value === null || value === undefined ? "" : String(value);

  }


  function getAppErrorMessage(error) {

    if (error && error.message) {
      return String(error.message)
        .replace(/^Exception:\s*/i, "")
        .replace(/^Error:\s*/i, "");
    }

    return typeof error === "string"
      ? error
      : "Terjadi kesalahan. Silakan coba kembali.";

  }



  /* =========================================================
     16. ASSET MANAGEMENT — INDIVIDUAL UNIT TRACKING
     All writes are delegated to Units.gs.
  ========================================================= */

  const assetUiState = {
    catalog: null,
    activeUnit: null,
    detailRequestId: 0,
    isReceiving: false,
    isMoving: false,
    receivingRows: [],
    nextReceivingRowId: 1,
    loadingRequestId: 0,
    selectedUnitIds: [],
    qrLibraryPromise: null,
    scanRequestId: 0,
    scanTimeoutId: null,
    isScanning: false
  };

  const assetStatusLabels = {
    IN_STOCK: "In Stock",
    ASSIGNED: "Assigned",
    IN_REPAIR: "In Repair",
    LOST: "Lost",
    DISPOSED: "Disposed"
  };

  const assetConditionLabels = {
    GOOD: "Good",
    MINOR_DAMAGE: "Minor Damage",
    DAMAGED: "Damaged",
    BROKEN: "Broken"
  };

  function renderAssetManagementPage() {
    const content = document.getElementById("page-content");
    if (!content) {
      renderModuleError("Kontainer halaman Asset Management tidak ditemukan.");
      return;
    }

    ensureAssetPageStyles();
    assetUiState.activeUnit = null;
    assetUiState.receivingRows = [];
    if (assetUiState.scanTimeoutId) {
      window.clearTimeout(assetUiState.scanTimeoutId);
      assetUiState.scanTimeoutId = null;
    }
    assetUiState.isScanning = false;
    assetUiState.scanRequestId++;

    content.innerHTML = `
      <section class="wms-asset-page">
        <div class="wms-asset-heading">
          <div>
            <div class="wms-asset-eyebrow">INDIVIDUAL UNIT CONTROL</div>
            <h1>Asset Management</h1>
            <p>Kelola Non-Consumable dan Fixed Asset per unit, termasuk lokasi, custodian, kondisi, dan riwayat pergerakannya.</p>
          </div>
          <div class="wms-asset-heading-actions">
            <button type="button" class="wms-asset-btn secondary" id="asset-refresh">↻ Refresh</button>
            <button type="button" class="wms-asset-btn primary" id="asset-receive">＋ Receive Units</button>
          </div>
        </div>

        <section class="wms-asset-scan-panel" aria-labelledby="asset-scan-title">
          <div class="wms-asset-scan-copy">
            <div class="wms-asset-scan-eyebrow">USB / BLUETOOTH HID · KEYBOARD SCAN MODE</div>
            <h2 id="asset-scan-title">Scan Asset QR</h2>
            <p>Hubungkan scanner 2D ke laptop, fokuskan kolom scan, lalu pindai label QR. Hasil scan akan dicari otomatis saat scanner mengirim tombol Enter.</p>
          </div>
          <form id="asset-qr-scan-form" class="wms-asset-scan-form" autocomplete="off">
            <input type="text" id="asset-qr-scan-input" placeholder="Fokus di sini, lalu scan QR aset..." autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Hasil scan QR asset">
            <button type="submit" class="wms-asset-btn primary" id="asset-qr-scan-submit">Cari Unit</button>
          </form>
          <div id="asset-qr-scan-status" class="wms-asset-scan-status" role="status" aria-live="polite">Siap menerima scan. Kolom scan akan difokuskan otomatis saat halaman dibuka.</div>
        </section>

        <div id="asset-error" class="wms-asset-alert error hidden" role="alert"></div>
        <div id="asset-loading" class="wms-asset-loading">Memuat data unit...</div>

        <div class="wms-asset-stats">
          <article class="wms-asset-stat"><span>Total Registered Units</span><strong id="asset-stat-total">—</strong><small>Seluruh unit terdaftar</small></article>
          <article class="wms-asset-stat"><span>In Stock</span><strong id="asset-stat-stock">—</strong><small>Tersedia di lokasi warehouse</small></article>
          <article class="wms-asset-stat"><span>Assigned</span><strong id="asset-stat-assigned">—</strong><small>Memiliki custodian</small></article>
          <article class="wms-asset-stat alert-stat"><span>Needs Attention</span><strong id="asset-stat-attention">—</strong><small>In Repair atau Lost</small></article>
        </div>

        <section class="wms-asset-panel">
          <div class="wms-asset-panel-head">
            <div><h2>Registered Units</h2><p>Setiap baris mewakili satu unit individual. Pilih unit untuk mencetak label QR, atau buka Details untuk melihat informasi lengkap.</p></div>
            <div class="wms-asset-filters">
              <input type="search" id="asset-search" placeholder="Search unit, item, serial, asset tag..." autocomplete="off">
              <select id="asset-status-filter" aria-label="Filter unit status">
                <option value="ALL">All Unit Statuses</option>
                <option value="IN_STOCK">In Stock</option>
                <option value="ASSIGNED">Assigned</option>
                <option value="IN_REPAIR">In Repair</option>
                <option value="LOST">Lost</option>
                <option value="DISPOSED">Disposed</option>
              </select>
              <select id="asset-location-filter" aria-label="Filter current location"><option value="ALL">All Locations</option></select>
            </div>
          </div>
          <div class="wms-asset-label-toolbar">
            <label class="wms-asset-select-visible"><input type="checkbox" id="asset-select-visible"> Select all visible</label>
            <button type="button" class="wms-asset-btn secondary" id="asset-print-selected" disabled>Print Selected Labels (0)</button>
          </div>
          <div class="wms-asset-table-wrap">
            <table class="wms-asset-table">
              <thead><tr>
                <th class="wms-asset-select-cell">Select</th><th>Unit Code</th><th>Item</th><th>Serial / Asset Tag</th><th>Location</th><th>Custodian</th><th>Status</th><th>Condition</th><th>Action</th>
              </tr></thead>
              <tbody id="asset-unit-body"><tr><td colspan="9" class="wms-asset-empty">Memuat data...</td></tr></tbody>
            </table>
          </div>
          <div class="wms-asset-footnote">Unit status dan current location diperbarui melalui Unit Movement. Riwayat pergerakan bersifat append-only.</div>
        </section>

        <section class="wms-asset-panel">
          <div class="wms-asset-panel-head">
            <div><h2>Recent Unit Movements</h2><p>100 pergerakan unit terbaru, termasuk receiving, transfer, assignment, return, perubahan kondisi, dan disposal.</p></div>
            <span class="wms-asset-readonly">UNIT MOVEMENTS · HISTORY</span>
          </div>
          <div class="wms-asset-table-wrap">
            <table class="wms-asset-table movement-table">
              <thead><tr><th>Moved At</th><th>Movement No.</th><th>Unit</th><th>Movement Type</th><th>From</th><th>To</th><th>Status</th><th>Reason</th><th>Recorded By</th></tr></thead>
              <tbody id="asset-movement-body"><tr><td colspan="9" class="wms-asset-empty">Belum ada pergerakan unit.</td></tr></tbody>
            </table>
          </div>
        </section>

        <div id="wms-asset-toast-stack" class="wms-asset-toast-stack" aria-live="polite"></div>

        <div id="asset-receive-modal" class="wms-asset-modal hidden" role="dialog" aria-modal="true" aria-labelledby="asset-receive-title">
          <div class="wms-asset-modal-card wide">
            <div class="wms-asset-modal-head"><div><h2 id="asset-receive-title">Receive Individual Units</h2><p>Daftarkan unit baru dari Gudang Pusat. Setiap unit akan memperoleh Unit Code dan QR Token tersendiri.</p></div><button type="button" class="wms-asset-icon-btn" data-asset-close="receive" aria-label="Close">×</button></div>
            <form id="asset-receive-form">
              <div id="asset-receive-error" class="wms-asset-alert error hidden" role="alert"></div>
              <div class="wms-asset-form-grid">
                <label class="wms-asset-field"><span>Item *</span><select id="asset-receive-item" required></select></label>
                <label class="wms-asset-field"><span>Receiving Location *</span><select id="asset-receive-location" required></select></label>
                <label class="wms-asset-field"><span>Received By</span><select id="asset-receive-person"></select></label>
                <label class="wms-asset-field"><span>Acquisition Date</span><input type="date" id="asset-acquisition-date"></label>
                <label class="wms-asset-field"><span>Acquisition Cost (per unit)</span><input type="number" min="0" step="0.01" id="asset-acquisition-cost" placeholder="0"></label>
                <label class="wms-asset-field"><span>Warranty Expiry</span><input type="date" id="asset-warranty-expiry"></label>
                <label class="wms-asset-field"><span>Condition</span><select id="asset-receive-condition"><option value="GOOD">Good</option><option value="MINOR_DAMAGE">Minor Damage</option><option value="DAMAGED">Damaged</option><option value="BROKEN">Broken</option></select></label>
                <label class="wms-asset-field"><span>Reference No.</span><input type="text" id="asset-receive-reference" maxlength="100" placeholder="Nomor DO / dokumen Gudang Pusat"></label>
                <label class="wms-asset-field full"><span>Receiving Reason *</span><input type="text" id="asset-receive-reason" maxlength="250" required value="Penerimaan unit dari Gudang Pusat"></label>
                <label class="wms-asset-field full"><span>Notes</span><textarea id="asset-receive-notes" rows="2" maxlength="1000" placeholder="Catatan penerimaan..."></textarea></label>
              </div>
              <div class="wms-asset-unit-entry-head"><div><h3>Unit Identification</h3><p id="asset-serial-hint">Serial Number mengikuti aturan Serial Required pada Item Master.</p></div><button type="button" class="wms-asset-btn secondary small" id="asset-add-unit-row">＋ Add Unit</button></div>
              <div id="asset-receive-rows" class="wms-asset-unit-entry-list"></div>
              <div class="wms-asset-modal-actions"><button type="button" class="wms-asset-btn secondary" data-asset-close="receive">Cancel</button><button type="submit" class="wms-asset-btn primary" id="asset-receive-submit">Receive &amp; Register Units</button></div>
            </form>
          </div>
        </div>

        <div id="asset-detail-modal" class="wms-asset-modal hidden" role="dialog" aria-modal="true" aria-labelledby="asset-detail-title">
          <div class="wms-asset-modal-card wide">
            <div class="wms-asset-modal-head"><div><h2 id="asset-detail-title">Unit Details</h2><p id="asset-detail-subtitle">Informasi unit dan riwayat pergerakan.</p></div><button type="button" class="wms-asset-icon-btn" data-asset-close="detail" aria-label="Close">×</button></div>
            <div id="asset-detail-content"><div class="wms-asset-loading">Memuat detail unit...</div></div>
            <div class="wms-asset-modal-actions"><button type="button" class="wms-asset-btn secondary" data-asset-close="detail">Close</button><button type="button" class="wms-asset-btn secondary" id="asset-print-current-label" disabled>Print QR Label</button><button type="button" class="wms-asset-btn primary" id="asset-detail-move" disabled>Record Movement</button></div>
          </div>
        </div>

        <div id="asset-movement-modal" class="wms-asset-modal hidden" role="dialog" aria-modal="true" aria-labelledby="asset-movement-title">
          <div class="wms-asset-modal-card">
            <div class="wms-asset-modal-head"><div><h2 id="asset-movement-title">Record Unit Movement</h2><p id="asset-movement-subtitle">Catat perpindahan atau perubahan unit.</p></div><button type="button" class="wms-asset-icon-btn" data-asset-close="movement" aria-label="Close">×</button></div>
            <form id="asset-movement-form">
              <div id="asset-movement-error" class="wms-asset-alert error hidden" role="alert"></div>
              <div class="wms-asset-current-unit" id="asset-movement-current-unit"></div>
              <div class="wms-asset-form-grid single">
                <label class="wms-asset-field"><span>Movement Type *</span><select id="asset-movement-type" required></select></label>
                <label class="wms-asset-field" id="asset-movement-location-wrap"><span id="asset-movement-location-label">Destination Location</span><select id="asset-movement-location"></select></label>
                <label class="wms-asset-field hidden" id="asset-movement-custodian-wrap"><span>Custodian</span><select id="asset-movement-custodian"></select></label>
                <label class="wms-asset-field hidden" id="asset-movement-status-wrap"><span>New Unit Status *</span><select id="asset-movement-status"></select></label>
                <label class="wms-asset-field hidden" id="asset-movement-condition-wrap"><span>New Condition *</span><input type="text" id="asset-movement-condition" maxlength="60" placeholder="Contoh: GOOD / DAMAGED"></label>
                <label class="wms-asset-field"><span>Received By</span><select id="asset-movement-received-by"></select></label>
                <label class="wms-asset-field"><span>Reference No.</span><input type="text" id="asset-movement-reference" maxlength="100"></label>
                <label class="wms-asset-field full"><span>Movement Reason *</span><input type="text" id="asset-movement-reason" maxlength="250" required placeholder="Alasan perubahan unit"></label>
                <label class="wms-asset-field full"><span>Notes</span><textarea id="asset-movement-notes" rows="2" maxlength="1000"></textarea></label>
              </div>
              <div class="wms-asset-modal-actions"><button type="button" class="wms-asset-btn secondary" data-asset-close="movement">Cancel</button><button type="submit" class="wms-asset-btn primary" id="asset-movement-submit">Save Movement</button></div>
            </form>
          </div>
        </div>
      </section>
    `;

    bindAssetPageEvents();
    loadAssetCatalog(false);
  }

  function ensureAssetPageStyles() {
    if (document.getElementById("wms-asset-page-styles")) return;
    const style = document.createElement("style");
    style.id = "wms-asset-page-styles";
    style.textContent = `
      .wms-asset-page{padding:26px 30px 42px;max-width:1600px;margin:0 auto;color:#f1f5f7}
      .wms-asset-heading{display:flex;align-items:flex-end;justify-content:space-between;gap:18px;margin-bottom:22px}
      .wms-asset-eyebrow{color:#26f4d0;font:600 9px 'JetBrains Mono',monospace;letter-spacing:.18em;margin-bottom:8px}
      .wms-asset-heading h1{font-size:28px;line-height:1.15;margin:0;font-weight:800;letter-spacing:-.035em}
      .wms-asset-heading p{color:#9aa6b5;font-size:12px;margin:8px 0 0;max-width:760px;line-height:1.6}
      .wms-asset-scan-panel{display:grid;grid-template-columns:minmax(210px,.9fr) minmax(280px,1.4fr);gap:10px 20px;align-items:center;padding:16px 18px;margin:0 0 18px;border:1px solid #285449;border-radius:12px;background:linear-gradient(120deg,rgba(25,76,67,.34),rgba(15,25,35,.96))}
      .wms-asset-scan-eyebrow{color:#5cebd0;font:700 8px 'JetBrains Mono',monospace;letter-spacing:.13em;margin-bottom:6px}
      .wms-asset-scan-copy h2{margin:0;color:#f1f5f7;font-size:15px;font-weight:800}
      .wms-asset-scan-copy p{margin:5px 0 0;color:#9aa9b8;font-size:9px;line-height:1.5}
      .wms-asset-scan-form{display:flex;gap:8px;min-width:0}
      .wms-asset-scan-form input{flex:1;min-width:0;border:1px solid #385064;border-radius:8px;background:#0a111a;color:#f1f5f7;padding:11px 12px;font:500 11px 'JetBrains Mono',monospace;outline:none}
      .wms-asset-scan-form input:focus{border-color:#26f4d0;box-shadow:0 0 0 3px rgba(38,244,208,.1)}
      .wms-asset-scan-status{grid-column:2;color:#8d9cac;font-size:9px;line-height:1.45;min-height:13px}
      .wms-asset-scan-status.success{color:#6cf0c4}.wms-asset-scan-status.error{color:#ff9ba6}.wms-asset-scan-status.busy{color:#ffcf7b}
      .wms-asset-heading-actions{display:flex;gap:9px;flex-shrink:0}
      .wms-asset-btn{appearance:none;border:1px solid #2b3847;border-radius:9px;padding:10px 14px;font:700 11px Manrope,sans-serif;cursor:pointer;transition:.18s ease;display:inline-flex;align-items:center;justify-content:center;gap:7px}
      .wms-asset-btn:disabled{opacity:.5;cursor:not-allowed}
      .wms-asset-btn.primary{background:#26f4d0;color:#07110f;border-color:#26f4d0}
      .wms-asset-btn.primary:hover:not(:disabled){background:#7af9e5}
      .wms-asset-btn.secondary{background:#111722;color:#d8e0e8}
      .wms-asset-btn.secondary:hover:not(:disabled){border-color:#26f4d0;color:#26f4d0}
      .wms-asset-btn.small{padding:7px 11px;font-size:10px}
      .wms-asset-alert{padding:11px 13px;border-radius:8px;margin:0 0 14px;font-size:11px;line-height:1.5}
      .wms-asset-alert.error{border:1px solid rgba(255,100,116,.35);background:rgba(255,100,116,.1);color:#ff9ba6}
      .wms-asset-loading{padding:24px;text-align:center;color:#91a0af;font-size:11px}
      .wms-asset-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:18px}
      .wms-asset-stat{border:1px solid #263241;border-radius:12px;background:linear-gradient(145deg,#121a25,#0d121b);padding:16px 18px;min-height:105px;display:flex;flex-direction:column;gap:7px}
      .wms-asset-stat span{color:#9aa8b8;font-size:10px;font-weight:600}
      .wms-asset-stat strong{font:700 25px 'JetBrains Mono',monospace;color:#f1f5f7;line-height:1.1}
      .wms-asset-stat small{color:#748295;font-size:9px}
      .wms-asset-stat.alert-stat strong{color:#ffbd5a}
      .wms-asset-panel{border:1px solid #2b3746;border-radius:12px;background:#0d1119;margin-bottom:17px;overflow:hidden}
      .wms-asset-panel-head{padding:16px 18px;display:flex;align-items:center;justify-content:space-between;gap:15px;border-bottom:1px solid #273342}
      .wms-asset-panel-head h2{margin:0;color:#f1f5f7;font-size:14px;font-weight:800}
      .wms-asset-panel-head p{margin:5px 0 0;color:#8492a3;font-size:10px;line-height:1.5}
      .wms-asset-filters{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
      .wms-asset-filters input,.wms-asset-filters select,.wms-asset-field input,.wms-asset-field select,.wms-asset-field textarea{min-width:0;border:1px solid #334153;border-radius:8px;background:#111925;color:#e8edf3;padding:9px 10px;font:500 10px Manrope,sans-serif;outline:none}
      .wms-asset-filters input{width:260px}.wms-asset-filters select{min-width:145px}
      .wms-asset-filters input:focus,.wms-asset-filters select:focus,.wms-asset-field input:focus,.wms-asset-field select:focus,.wms-asset-field textarea:focus{border-color:#26f4d0;box-shadow:0 0 0 2px rgba(38,244,208,.08)}
      .wms-asset-table-wrap{width:100%;overflow:auto}
      .wms-asset-table{width:100%;border-collapse:collapse;min-width:900px}
      .wms-asset-table th{padding:11px 12px;text-align:left;white-space:nowrap;background:#111925;color:#7f91a4;border-bottom:1px solid #2a3746;font:500 9px 'JetBrains Mono',monospace;letter-spacing:.02em}
      .wms-asset-table td{padding:12px;border-bottom:1px solid #202b38;color:#bbc5d0;font-size:10px;vertical-align:middle}
      .wms-asset-table tbody tr:hover{background:rgba(255,255,255,.018)}
      .wms-asset-table tbody tr:last-child td{border-bottom:0}
      .wms-asset-table .primary-text{color:#f1f5f7;font-weight:700}
      .wms-asset-table .secondary-text{display:block;color:#718093;font-size:9px;margin-top:3px}
      .wms-asset-empty{text-align:center!important;color:#7d8b9b!important;padding:25px!important}
      .wms-asset-readonly{white-space:nowrap;border:1px solid #334153;border-radius:6px;padding:6px 8px;color:#8da0b4;font:500 8px 'JetBrains Mono',monospace;letter-spacing:.1em}
      .wms-asset-footnote{padding:10px 16px;border-top:1px solid #263241;color:#758498;font-size:9px;line-height:1.5}
      .wms-asset-badge{display:inline-flex;align-items:center;padding:4px 7px;border-radius:99px;font:600 8px 'JetBrains Mono',monospace;white-space:nowrap;background:#202a37;color:#c4cfda}
      .wms-asset-badge.IN_STOCK{background:rgba(38,244,208,.12);color:#65f2dc}.wms-asset-badge.ASSIGNED{background:rgba(155,124,255,.15);color:#c2adff}.wms-asset-badge.IN_REPAIR{background:rgba(255,189,90,.15);color:#ffce80}.wms-asset-badge.LOST{background:rgba(255,100,116,.15);color:#ff98a3}.wms-asset-badge.DISPOSED{background:#252b32;color:#8995a1}
      .wms-asset-row-btn{border:1px solid #3a495c;background:#131d29;color:#26f4d0;border-radius:7px;padding:6px 9px;font:700 9px Manrope,sans-serif;cursor:pointer}.wms-asset-row-btn:hover{border-color:#26f4d0}
      .wms-asset-label-toolbar{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 16px;border-bottom:1px solid #263241;background:#0c121b}
      .wms-asset-select-visible{display:inline-flex;align-items:center;gap:8px;color:#9eacba;font-size:10px;font-weight:700;cursor:pointer}
      .wms-asset-select-visible input,.wms-asset-unit-select{width:15px;height:15px;accent-color:#26f4d0;cursor:pointer}
      .wms-asset-select-cell{width:54px;text-align:center!important}
      .wms-asset-unit-select{display:block;margin:0 auto}
      .wms-asset-qr-panel{display:grid;grid-template-columns:160px minmax(0,1fr);gap:16px;align-items:center;padding:14px;margin:0 0 16px;border:1px solid #2d4051;border-radius:10px;background:#0c151f}
      .wms-asset-qr-preview{width:148px;height:148px;display:grid;place-items:center;background:#fff;border-radius:8px;padding:5px;overflow:hidden}
      .wms-asset-qr-preview svg{display:block;width:100%;height:100%}
      .wms-asset-qr-meta{min-width:0}.wms-asset-qr-meta .eyebrow{color:#7d91a5;font:600 8px 'JetBrains Mono',monospace;letter-spacing:.12em;text-transform:uppercase;margin-bottom:6px}
      .wms-asset-qr-meta h3{margin:0 0 5px;color:#f1f5f7;font-size:15px;font-weight:800}
      .wms-asset-qr-meta p{margin:0 0 10px;color:#91a0b0;font-size:10px;line-height:1.5}
      .wms-asset-qr-meta code{display:block;padding:8px 9px;border:1px dashed #3a5266;border-radius:7px;background:#101b27;color:#7af9e5;font:9px 'JetBrains Mono',monospace;overflow-wrap:anywhere}
      .wms-asset-qr-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
      .wms-asset-qr-placeholder{color:#637386;font:600 9px 'JetBrains Mono',monospace;text-align:center;padding:12px}
      .wms-asset-toast-stack{position:fixed;right:22px;top:96px;z-index:10020;display:flex;flex-direction:column;gap:8px;pointer-events:none}
      .wms-asset-toast{pointer-events:auto;min-width:240px;max-width:390px;padding:12px 14px;border:1px solid #2c665d;border-radius:9px;background:#10241f;color:#b8f8e8;box-shadow:0 14px 36px rgba(0,0,0,.32);font-size:10px;display:flex;align-items:flex-start;gap:10px}
      .wms-asset-toast.warning{background:#2b2110;border-color:#80602c;color:#ffdc9d}.wms-asset-toast.error{background:#2d151a;border-color:#873a45;color:#ffb1ba}.wms-asset-toast button{margin-left:auto;border:0;background:transparent;color:inherit;font-size:16px;cursor:pointer}
      .wms-asset-modal{position:fixed;inset:0;z-index:10010;background:rgba(2,5,9,.78);backdrop-filter:blur(7px);display:flex;align-items:center;justify-content:center;padding:18px}
      .wms-asset-modal.hidden{display:none!important}
      .wms-asset-modal-card{width:min(620px,100%);max-height:92vh;overflow:auto;border:1px solid #334153;border-radius:14px;background:#0e151f;box-shadow:0 25px 90px rgba(0,0,0,.55);padding:20px}
      .wms-asset-modal-card.wide{width:min(880px,100%)}
      .wms-asset-modal-head{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;margin-bottom:17px}
      .wms-asset-modal-head h2{margin:0;color:#f1f5f7;font-size:17px;font-weight:800}
      .wms-asset-modal-head p{margin:6px 0 0;color:#8897a8;font-size:10px;line-height:1.5}
      .wms-asset-icon-btn{width:30px;height:30px;flex:0 0 30px;border:1px solid #354254;border-radius:8px;background:#151e2a;color:#cbd5df;font-size:19px;cursor:pointer}
      .wms-asset-form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
      .wms-asset-form-grid.single{grid-template-columns:1fr}
      .wms-asset-field{display:flex;flex-direction:column;gap:6px;min-width:0;color:#b6c2ce;font-size:10px;font-weight:700}
      .wms-asset-field.full{grid-column:1/-1}
      .wms-asset-field input,.wms-asset-field select,.wms-asset-field textarea{width:100%;font-size:11px}
      .wms-asset-field textarea{resize:vertical;min-height:55px}
      .wms-asset-unit-entry-head{margin:20px 0 10px;display:flex;align-items:center;justify-content:space-between;gap:12px;border-top:1px solid #263342;padding-top:16px}
      .wms-asset-unit-entry-head h3{margin:0;color:#edf2f7;font-size:12px}.wms-asset-unit-entry-head p{margin:4px 0 0;color:#7f8e9f;font-size:9px}
      .wms-asset-unit-entry-list{display:flex;flex-direction:column;gap:8px}
      .wms-asset-unit-row{display:grid;grid-template-columns:30px minmax(0,1fr) minmax(0,1fr) minmax(0,1fr) 30px;gap:7px;align-items:center;padding:9px;border:1px solid #273443;border-radius:9px;background:#111a26}
      .wms-asset-unit-row .row-no{color:#7b8b9e;font:600 9px 'JetBrains Mono',monospace;text-align:center}
      .wms-asset-unit-row input{width:100%;min-width:0;padding:8px;border:1px solid #344254;border-radius:6px;background:#0d141e;color:#edf2f7;font:10px Manrope,sans-serif;outline:none}
      .wms-asset-unit-row input:focus{border-color:#26f4d0}
      .wms-asset-unit-row button{width:28px;height:28px;border:1px solid #57343a;border-radius:6px;background:#27181d;color:#ff9aa4;cursor:pointer}
      .wms-asset-modal-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:19px;padding-top:14px;border-top:1px solid #263342}
      .wms-asset-current-unit{padding:11px 13px;border:1px solid #2b3949;border-radius:9px;background:#121d29;color:#d7e0e9;font-size:10px;line-height:1.6;margin-bottom:14px}
      .wms-asset-detail-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;margin-bottom:15px}
      .wms-asset-detail-cell{padding:10px;border:1px solid #283647;border-radius:8px;background:#111a25;min-width:0}
      .wms-asset-detail-cell span{display:block;color:#7d8da0;font-size:8px;text-transform:uppercase;letter-spacing:.08em;margin-bottom:5px}
      .wms-asset-detail-cell strong{display:block;color:#e7edf4;font-size:10px;overflow-wrap:anywhere}
      .wms-asset-qr-token{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:11px 13px;margin-bottom:16px;border:1px dashed #3a5266;border-radius:8px;background:#101b27}
      .wms-asset-qr-token div{min-width:0}.wms-asset-qr-token span{display:block;color:#8293a6;font-size:8px;text-transform:uppercase;letter-spacing:.1em;margin-bottom:4px}.wms-asset-qr-token code{color:#7af9e5;font:10px 'JetBrains Mono',monospace;overflow-wrap:anywhere}
      .wms-asset-section-title{margin:14px 0 8px;color:#eaf0f6;font-size:11px;font-weight:800}
      .wms-asset-history-wrap{max-height:240px;overflow:auto;border:1px solid #293747;border-radius:8px}
      .wms-asset-history{width:100%;border-collapse:collapse;min-width:620px}.wms-asset-history th{position:sticky;top:0;background:#172231;color:#8596a9;text-align:left;padding:8px;font:500 8px 'JetBrains Mono',monospace}.wms-asset-history td{padding:8px;border-top:1px solid #253242;color:#c0cbd6;font-size:9px;vertical-align:top}
      @media(max-width:1050px){.wms-asset-scan-panel{grid-template-columns:1fr}.wms-asset-scan-status{grid-column:1}.wms-asset-stats{grid-template-columns:repeat(2,minmax(0,1fr))}.wms-asset-panel-head{align-items:flex-start;flex-direction:column}.wms-asset-filters{width:100%}.wms-asset-filters input{flex:1;width:auto}}
      @media(max-width:680px){.wms-asset-scan-panel{padding:13px}.wms-asset-scan-form{flex-direction:column}.wms-asset-scan-form button{width:100%}.wms-asset-label-toolbar{align-items:flex-start;flex-direction:column}.wms-asset-qr-panel{grid-template-columns:1fr}.wms-asset-qr-preview{margin:0 auto}.wms-asset-qr-meta{text-align:center}.wms-asset-qr-meta code{text-align:left}.wms-asset-qr-actions{justify-content:center}.wms-asset-page{padding:18px 12px 30px}.wms-asset-heading{align-items:flex-start;flex-direction:column}.wms-asset-heading-actions{width:100%}.wms-asset-heading-actions button{flex:1}.wms-asset-stats{gap:8px}.wms-asset-stat{padding:12px;min-height:95px}.wms-asset-stat strong{font-size:20px}.wms-asset-filters{display:grid;grid-template-columns:1fr}.wms-asset-filters input,.wms-asset-filters select{width:100%}.wms-asset-form-grid{grid-template-columns:1fr}.wms-asset-field.full{grid-column:auto}.wms-asset-modal{padding:8px}.wms-asset-modal-card{padding:14px;max-height:95vh}.wms-asset-detail-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.wms-asset-unit-row{grid-template-columns:24px minmax(0,1fr) minmax(0,1fr) 28px}.wms-asset-unit-row .unit-notes{grid-column:2/4}.wms-asset-unit-row button{grid-column:4;grid-row:1/3}.wms-asset-toast-stack{left:10px;right:10px;top:75px}.wms-asset-toast{max-width:none}}
    `;
    document.head.appendChild(style);
  }

  function bindAssetPageEvents() {
    document.getElementById("asset-refresh").addEventListener("click", function() { loadAssetCatalog(true); });
    document.getElementById("asset-receive").addEventListener("click", openAssetReceivingModal);
    document.getElementById("asset-qr-scan-form").addEventListener("submit", function(event) {
      event.preventDefault();
      submitAssetQrScan();
    });
    document.getElementById("asset-search").addEventListener("input", renderAssetUnitTable);
    document.getElementById("asset-status-filter").addEventListener("change", renderAssetUnitTable);
    document.getElementById("asset-location-filter").addEventListener("change", renderAssetUnitTable);
    document.getElementById("asset-select-visible").addEventListener("change", toggleVisibleAssetUnitSelection);
    document.getElementById("asset-print-selected").addEventListener("click", printSelectedAssetLabels);
    document.getElementById("asset-print-current-label").addEventListener("click", function() {
      if (assetUiState.activeUnit) printAssetLabels([assetUiState.activeUnit]);
    });
    document.getElementById("asset-receive-item").addEventListener("change", updateAssetSerialRequirement);
    document.getElementById("asset-add-unit-row").addEventListener("click", addAssetReceivingRow);
    document.getElementById("asset-receive-form").addEventListener("submit", saveAssetReceiving);
    document.getElementById("asset-movement-type").addEventListener("change", updateAssetMovementForm);
    document.getElementById("asset-movement-status").addEventListener("change", updateAssetMovementForm);
    document.getElementById("asset-movement-form").addEventListener("submit", saveAssetMovement);
    document.getElementById("asset-detail-move").addEventListener("click", function() {
      if (assetUiState.activeUnit) openAssetMovementModal(assetUiState.activeUnit);
    });
    document.querySelectorAll("[data-asset-close]").forEach(function(button) {
      button.addEventListener("click", function() { closeAssetModal(button.dataset.assetClose); });
    });
    const scanInput = document.getElementById("asset-qr-scan-input");
    if (scanInput) window.setTimeout(function() { scanInput.focus(); }, 80);
    ["asset-receive-modal", "asset-detail-modal", "asset-movement-modal"].forEach(function(id) {
      const modal = document.getElementById(id);
      modal.addEventListener("click", function(event) {
        if (event.target === modal) closeAssetModal(modal.id.replace("asset-", "").replace("-modal", ""));
      });
    });
  }

  function loadAssetCatalog(showToast) {
    const requestId = ++assetUiState.loadingRequestId;
    const loading = document.getElementById("asset-loading");
    const error = document.getElementById("asset-error");
    const refresh = document.getElementById("asset-refresh");
    if (loading) loading.classList.remove("hidden");
    if (error) { error.classList.add("hidden"); error.textContent = ""; }
    if (refresh) { refresh.disabled = true; refresh.textContent = "Loading..."; }

    google.script.run
      .withSuccessHandler(function(result) {
        if (requestId !== assetUiState.loadingRequestId || currentPage !== "assets") return;
        if (loading) loading.classList.add("hidden");
        if (refresh) { refresh.disabled = false; refresh.textContent = "↻ Refresh"; }
        if (!result || !result.ok) {
          showAssetError("Respons Asset Management tidak valid.");
          return;
        }
        assetUiState.catalog = result;
        const registeredIds = (result.units || []).map(function(unit) { return unit.unit_id; });
        assetUiState.selectedUnitIds = assetUiState.selectedUnitIds.filter(function(id) { return registeredIds.includes(id); });
        populateAssetLocationFilter();
        renderAssetStats();
        renderAssetUnitTable();
        renderAssetMovementTable();
        if (showToast) showAssetToast("Data Asset Management berhasil diperbarui.", "success");
      })
      .withFailureHandler(function(errorValue) {
        if (requestId !== assetUiState.loadingRequestId || currentPage !== "assets") return;
        if (loading) loading.classList.add("hidden");
        if (refresh) { refresh.disabled = false; refresh.textContent = "↻ Refresh"; }
        showAssetError(getAppErrorMessage(errorValue));
      })
      .getIndividualUnitCatalog();
  }

  function renderAssetStats() {
    const units = assetUiState.catalog && Array.isArray(assetUiState.catalog.units) ? assetUiState.catalog.units : [];
    const count = function(status) { return units.filter(function(unit) { return String(unit.unit_status || "").toUpperCase() === status; }).length; };
    setTextIfExists("asset-stat-total", units.length.toLocaleString("id-ID"));
    setTextIfExists("asset-stat-stock", count("IN_STOCK").toLocaleString("id-ID"));
    setTextIfExists("asset-stat-assigned", count("ASSIGNED").toLocaleString("id-ID"));
    setTextIfExists("asset-stat-attention", (count("IN_REPAIR") + count("LOST")).toLocaleString("id-ID"));
  }

  function populateAssetLocationFilter() {
    const select = document.getElementById("asset-location-filter");
    if (!select) return;
    const prior = select.value || "ALL";
    select.replaceChildren();
    const all = document.createElement("option"); all.value = "ALL"; all.textContent = "All Locations"; select.appendChild(all);
    const locations = assetUiState.catalog && Array.isArray(assetUiState.catalog.locations) ? assetUiState.catalog.locations : [];
    locations.slice().sort(function(a,b) { return String(a.location_name).localeCompare(String(b.location_name)); }).forEach(function(location) {
      const option = document.createElement("option"); option.value = location.location_id; option.textContent = [location.location_code, location.location_name].filter(Boolean).join(" · "); select.appendChild(option);
    });
    if (["ALL"].concat(locations.map(function(row) { return row.location_id; })).includes(prior)) select.value = prior;
  }

  function getFilteredAssetUnits() {
    const catalog = assetUiState.catalog || {};
    const units = Array.isArray(catalog.units) ? catalog.units : [];
    const searchElement = document.getElementById("asset-search");
    const statusElement = document.getElementById("asset-status-filter");
    const locationElement = document.getElementById("asset-location-filter");
    const query = String(searchElement ? searchElement.value : "").trim().toLowerCase();
    const statusFilter = statusElement ? statusElement.value : "ALL";
    const locationFilter = locationElement ? locationElement.value : "ALL";

    return units.filter(function(unit) {
      if (statusFilter !== "ALL" && unit.unit_status !== statusFilter) return false;
      if (locationFilter !== "ALL" && unit.current_location_id !== locationFilter) return false;
      const text = [unit.unit_code, unit.item_code, unit.item_name, unit.serial_number,
        unit.asset_tag, unit.current_location_name, unit.current_custodian_name,
        unit.unit_status, unit.condition_status].join(" ").toLowerCase();
      return !query || text.includes(query);
    });
  }

  function updateAssetLabelSelectionControls(visibleUnits) {
    const button = document.getElementById("asset-print-selected");
    const selectVisible = document.getElementById("asset-select-visible");
    const visible = Array.isArray(visibleUnits) ? visibleUnits : getFilteredAssetUnits();
    const selectedCount = assetUiState.selectedUnitIds.length;
    if (button) {
      button.disabled = selectedCount === 0;
      button.textContent = "Print Selected Labels (" + selectedCount + ")";
    }
    if (selectVisible) {
      const selectable = visible.filter(function(unit) { return !!unit.qr_token; });
      const selectedVisible = selectable.filter(function(unit) {
        return assetUiState.selectedUnitIds.includes(unit.unit_id);
      }).length;
      selectVisible.checked = selectable.length > 0 && selectedVisible === selectable.length;
      selectVisible.indeterminate = selectedVisible > 0 && selectedVisible < selectable.length;
      selectVisible.disabled = selectable.length === 0;
    }
  }

  function toggleVisibleAssetUnitSelection() {
    const selectVisible = document.getElementById("asset-select-visible");
    if (!selectVisible) return;
    const visibleIds = getFilteredAssetUnits().filter(function(unit) { return !!unit.qr_token; })
      .map(function(unit) { return unit.unit_id; });
    if (selectVisible.checked) {
      visibleIds.forEach(function(id) {
        if (!assetUiState.selectedUnitIds.includes(id)) assetUiState.selectedUnitIds.push(id);
      });
    } else {
      assetUiState.selectedUnitIds = assetUiState.selectedUnitIds.filter(function(id) {
        return !visibleIds.includes(id);
      });
    }
    renderAssetUnitTable();
  }

  function renderAssetUnitTable() {
    const body = document.getElementById("asset-unit-body");
    if (!body) return;
    body.replaceChildren();
    const units = getFilteredAssetUnits();
    if (!units.length) {
      const row = document.createElement("tr");
      const cell = document.createElement("td");
      cell.colSpan = 9;
      cell.className = "wms-asset-empty";
      cell.textContent = (assetUiState.catalog && assetUiState.catalog.units || []).length
        ? "Tidak ada unit yang sesuai dengan filter."
        : "Belum ada unit terdaftar. Gunakan Receive Units untuk mendaftarkan unit baru.";
      row.appendChild(cell);
      body.appendChild(row);
      updateAssetLabelSelectionControls(units);
      return;
    }

    units.forEach(function(unit) {
      const row = document.createElement("tr");

      const selectCell = document.createElement("td");
      selectCell.className = "wms-asset-select-cell";
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.className = "wms-asset-unit-select";
      checkbox.checked = assetUiState.selectedUnitIds.includes(unit.unit_id);
      checkbox.disabled = !unit.qr_token;
      checkbox.title = unit.qr_token ? "Select unit for QR label printing" : "Unit does not have a QR token";
      checkbox.setAttribute("aria-label", "Select " + (unit.unit_code || "unit"));
      checkbox.addEventListener("change", function() {
        if (checkbox.checked) {
          if (!assetUiState.selectedUnitIds.includes(unit.unit_id)) assetUiState.selectedUnitIds.push(unit.unit_id);
        } else {
          assetUiState.selectedUnitIds = assetUiState.selectedUnitIds.filter(function(id) { return id !== unit.unit_id; });
        }
        updateAssetLabelSelectionControls(getFilteredAssetUnits());
      });
      selectCell.appendChild(checkbox);
      row.appendChild(selectCell);

      const codeCell = document.createElement("td");
      const code = document.createElement("span"); code.className = "primary-text"; code.textContent = unit.unit_code || "-"; codeCell.appendChild(code);
      const unitId = document.createElement("span"); unitId.className = "secondary-text"; unitId.textContent = String(unit.unit_id || "").slice(0, 8); codeCell.appendChild(unitId); row.appendChild(codeCell);

      const itemCell = document.createElement("td");
      const item = document.createElement("span"); item.className = "primary-text"; item.textContent = unit.item_name || "-"; itemCell.appendChild(item);
      const itemCode = document.createElement("span"); itemCode.className = "secondary-text"; itemCode.textContent = unit.item_code || "-"; itemCell.appendChild(itemCode); row.appendChild(itemCell);

      const identityCell = document.createElement("td");
      const serial = document.createElement("span"); serial.className = "primary-text"; serial.textContent = unit.serial_number || "-"; identityCell.appendChild(serial);
      const tag = document.createElement("span"); tag.className = "secondary-text"; tag.textContent = "Asset Tag: " + (unit.asset_tag || "-"); identityCell.appendChild(tag); row.appendChild(identityCell);
      appendTextCell(row, [unit.current_location_code, unit.current_location_name].filter(Boolean).join(" · ") || "-");
      appendTextCell(row, unit.current_custodian_name || "-");

      const statusCell = document.createElement("td");
      const badge = document.createElement("span"); badge.className = "wms-asset-badge " + (unit.unit_status || "");
      badge.textContent = assetStatusLabels[unit.unit_status] || unit.unit_status || "-"; statusCell.appendChild(badge); row.appendChild(statusCell);
      appendTextCell(row, unit.condition_status || "-");

      const actionCell = document.createElement("td");
      const button = document.createElement("button"); button.type = "button"; button.className = "wms-asset-row-btn"; button.textContent = "Details";
      button.addEventListener("click", function() { openAssetUnitDetails(unit.unit_id); });
      actionCell.appendChild(button); row.appendChild(actionCell);
      body.appendChild(row);
    });
    updateAssetLabelSelectionControls(units);
  }

  function printSelectedAssetLabels() {
    const selectedIds = assetUiState.selectedUnitIds.slice();
    const allUnits = assetUiState.catalog && Array.isArray(assetUiState.catalog.units)
      ? assetUiState.catalog.units : [];
    const units = allUnits.filter(function(unit) { return selectedIds.includes(unit.unit_id); });
    if (!units.length) {
      showAssetToast("Pilih minimal satu unit yang memiliki QR Token.", "warning");
      return;
    }
    printAssetLabels(units);
  }

  function ensureAssetQrLibrary() {
    if (typeof window.qrcode === "function") return Promise.resolve();
    if (assetUiState.qrLibraryPromise) return assetUiState.qrLibraryPromise;

    assetUiState.qrLibraryPromise = new Promise(function(resolve, reject) {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js";
      script.async = true;
      script.onload = function() {
        if (typeof window.qrcode === "function") resolve();
        else reject(new Error("QR generator tidak berhasil diinisialisasi."));
      };
      script.onerror = function() {
        reject(new Error("Library QR tidak dapat dimuat. Periksa koneksi ke CDN."));
      };
      document.head.appendChild(script);
    }).catch(function(error) {
      assetUiState.qrLibraryPromise = null;
      throw error;
    });
    return assetUiState.qrLibraryPromise;
  }

  function createAssetQrSvg(qrToken) {
    const token = String(qrToken || "").trim();
    if (!token) throw new Error("QR Token unit belum tersedia.");
    const qr = window.qrcode(0, "H");
    qr.addData("WMSUNIT:" + token);
    qr.make();
    return qr.createSvgTag(4, 4);
  }

  function renderAssetUnitQr(unit) {
    const preview = document.getElementById("asset-detail-qr-preview");
    const printButton = document.getElementById("asset-print-current-label");
    if (!preview) return;
    if (!unit || !unit.qr_token) {
      preview.innerHTML = '<div class="wms-asset-qr-placeholder">QR TOKEN NOT AVAILABLE</div>';
      if (printButton) printButton.disabled = true;
      return;
    }
    preview.innerHTML = '<div class="wms-asset-qr-placeholder">GENERATING QR...</div>';
    if (printButton) printButton.disabled = true;
    ensureAssetQrLibrary().then(function() {
      if (!assetUiState.activeUnit || assetUiState.activeUnit.unit_id !== unit.unit_id) return;
      const currentPreview = document.getElementById("asset-detail-qr-preview");
      if (!currentPreview) return;
      const svg = createAssetQrSvg(unit.qr_token);
      currentPreview.innerHTML = svg;
      if (printButton) printButton.disabled = false;
    }).catch(function(error) {
      if (!assetUiState.activeUnit || assetUiState.activeUnit.unit_id !== unit.unit_id) return;
      const currentPreview = document.getElementById("asset-detail-qr-preview");
      if (currentPreview) currentPreview.innerHTML = '<div class="wms-asset-qr-placeholder">QR GENERATION FAILED</div>';
      showAssetToast(error.message || "QR Code gagal dibuat.", "warning");
    });
  }

  function printAssetLabels(units) {
    const list = (units || []).filter(function(unit) {
      return unit && unit.qr_token;
    });

    if (!list.length) {
      showAssetToast("Tidak ada QR Token yang bisa dicetak.", "warning");
      return;
    }

    // Open the print window synchronously while the browser still has the user gesture.
    const printWindow = window.open("", "_blank", "width=900,height=760");
    if (!printWindow) {
      showAssetToast("Popup diblokir browser. Izinkan popup untuk mencetak label.", "warning");
      return;
    }

    printWindow.document.open();
    printWindow.document.write(
      "<!DOCTYPE html><html lang='id'><head><meta charset='UTF-8'>" +
      "<meta name='viewport' content='width=device-width,initial-scale=1'>" +
      "<title>WMS Asset QR Labels</title></head>" +
      "<body style='font-family:Arial,sans-serif;padding:20px'>Mempersiapkan label QR...</body></html>"
    );
    printWindow.document.close();

    ensureAssetQrLibrary().then(function() {
      const labels = list.map(function(unit) {
        const svg = createAssetQrSvg(unit.qr_token);
        const info = [
          '<div class="asset-label-code">' + escapeAssetHtml(unit.unit_code || "-") + '</div>',
          '<div class="asset-label-name">' + escapeAssetHtml(unit.item_name || unit.item_code || "Individual Unit") + '</div>',
          '<div class="asset-label-meta">' + escapeAssetHtml(unit.item_code || "") + '</div>',
          '<div class="asset-label-meta">SN: ' + escapeAssetHtml(unit.serial_number || "-") + '</div>',
          unit.asset_tag
            ? '<div class="asset-label-meta">Tag: ' + escapeAssetHtml(unit.asset_tag) + '</div>'
            : ''
        ].join("");

        return (
          '<article class="asset-label">' +
            '<div class="asset-label-qr" role="img" aria-label="QR ' +
              escapeAssetHtml(unit.unit_code || "unit") + '">' + svg +
            '</div>' +
            '<div class="asset-label-info">' + info +
              '<div class="asset-label-footer">WMS ASSET IDENTIFICATION</div>' +
            '</div>' +
          '</article>'
        );
      }).join("");

      const printCss = [
        "*{box-sizing:border-box}",
        "html,body{margin:0;padding:0;background:#eef1f6;color:#111;font-family:Arial,sans-serif}",
        ".print-toolbar{position:sticky;top:0;z-index:5;padding:14px 18px;background:#fff;border-bottom:1px solid #dce1eb;display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;font:13px Arial,sans-serif;box-shadow:0 2px 10px rgba(20,30,60,.06)}",
        ".toolbar-left{display:flex;flex-direction:column;gap:5px}",
        ".toolbar-title{font-size:14px;font-weight:700;color:#202238}",
        ".toolbar-subtitle{font-size:12px;color:#647089}",
        ".toolbar-controls{display:flex;align-items:center;gap:9px;flex-wrap:wrap}",
        ".toolbar-controls label{font-size:12px;font-weight:700;color:#4b5068}",
        ".toolbar-controls select{height:38px;min-width:245px;padding:0 10px;border:1px solid #d7d9e8;border-radius:7px;background:#fff;color:#202238;font:12px Arial,sans-serif}",
        ".toolbar-controls button{border:0;border-radius:7px;background:#5148d8;color:#fff;padding:11px 17px;font-weight:700;cursor:pointer}",
        ".toolbar-controls button:hover{background:#4338ca}",
        ".print-sheet{display:flex;flex-direction:column;align-items:center;padding:14px 0 28px;gap:10px}",
        ".asset-label{display:flex;align-items:center;justify-content:flex-start;gap:4mm;overflow:hidden;background:#fff;border:1px solid #d9dce8;border-radius:1mm;break-after:page;page-break-after:always}",
        ".asset-label:last-child{break-after:auto;page-break-after:auto}",
        ".asset-label-qr{display:grid;place-items:center;flex:0 0 auto}",
        ".asset-label-qr svg{display:block;max-width:100%;max-height:100%;width:100%;height:100%}",
        ".asset-label-info{min-width:0;flex:1;overflow:hidden;display:flex;flex-direction:column;justify-content:center;text-align:left}",
        ".asset-label-code{width:100%;font-size:10pt;font-weight:800;line-height:1.2;overflow-wrap:anywhere;word-break:break-word;color:#172033}",
        ".asset-label-name{width:100%;font-size:8pt;font-weight:700;line-height:1.2;margin-top:1.5mm;overflow-wrap:anywhere;word-break:break-word;color:#27324b}",
        ".asset-label-meta{width:100%;font-size:6.5pt;line-height:1.25;margin-top:1mm;overflow-wrap:anywhere;word-break:break-word;color:#475569}",
        ".asset-label-footer{width:100%;font-size:5pt;letter-spacing:.05em;margin-top:2mm;color:#64748b}",
        ".print-sheet.format-100x50 .asset-label{width:100mm;height:50mm;min-width:100mm;max-width:100mm;min-height:50mm;max-height:50mm;padding:3mm;flex-direction:row}",
        ".print-sheet.format-100x50 .asset-label-qr{width:42mm;height:42mm;flex-basis:42mm}",
        ".print-sheet.format-100x50 .asset-label-info{height:100%;padding:1mm 0}",
        ".print-sheet.format-50x50 .asset-label{width:50mm;height:50mm;min-width:50mm;max-width:50mm;min-height:50mm;max-height:50mm;padding:4mm;flex-direction:column;align-items:center;justify-content:center;gap:0}",
        ".print-sheet.format-50x50 .asset-label-qr{width:42mm;height:42mm;flex:0 0 42mm}",
        ".print-sheet.format-50x50 .asset-label-info{display:none}",
        "@page{size:100mm 50mm;margin:0}",
        "@media print{html,body{margin:0;padding:0;background:#fff}.print-toolbar{display:none!important}.print-sheet{display:block;padding:0;margin:0;gap:0}.asset-label{margin:0;border:0;border-radius:0;box-shadow:none;break-after:page;page-break-after:always}.asset-label:last-child{break-after:auto;page-break-after:auto}.print-sheet.format-100x50 .asset-label{width:100mm;height:50mm;min-width:100mm;max-width:100mm;min-height:50mm;max-height:50mm;padding:3mm}.print-sheet.format-50x50 .asset-label{width:50mm;height:50mm;min-width:50mm;max-width:50mm;min-height:50mm;max-height:50mm;padding:4mm}}",
        "@media screen{.print-sheet.format-100x50 .asset-label{box-shadow:0 2px 10px rgba(20,30,60,.10)}.print-sheet.format-50x50 .asset-label{box-shadow:0 2px 10px rgba(20,30,60,.10)}}"
      ].join("");

      const html = [
        "<!DOCTYPE html>",
        "<html lang='id'><head>",
        "<meta charset='UTF-8'>",
        "<meta name='viewport' content='width=device-width,initial-scale=1'>",
        "<title>WMS Asset QR Labels</title>",
        "<style id='wms-label-print-css'>", printCss, "</style>",
        "</head><body>",
        "<div class='print-toolbar'>",
          "<div class='toolbar-left'>",
            "<div class='toolbar-title'>WMS Asset QR Labels</div>",
            "<div class='toolbar-subtitle' id='label-format-description'>" +
              list.length + " label · 100 × 50 mm · Landscape · QR dan informasi unit</div>",
          "</div>",
          "<div class='toolbar-controls'>",
            "<label for='label-format-select'>Ukuran label</label>",
            "<select id='label-format-select'>",
              "<option value='100x50'>100 × 50 mm — Landscape (QR + informasi)</option>",
              "<option value='50x50'>50 × 50 mm — Square (QR saja)</option>",
            "</select>",
            "<button type='button' id='wms-label-print-button'>Print Labels</button>",
          "</div>",
        "</div>",
        "<main class='print-sheet format-100x50' id='wms-label-print-sheet'>",
          labels,
        "</main>",
        "</body></html>"
      ].join("");

      printWindow.document.open();
      printWindow.document.write(html);
      printWindow.document.close();

      const select = printWindow.document.getElementById("label-format-select");
      const sheet = printWindow.document.getElementById("wms-label-print-sheet");
      const description = printWindow.document.getElementById("label-format-description");
      const printButton = printWindow.document.getElementById("wms-label-print-button");

      function applySelectedLabelFormat() {
        if (!select || !sheet) return;

        const format = select.value === "50x50" ? "50x50" : "100x50";
        sheet.className = "print-sheet format-" + format;

        const printStyle = printWindow.document.getElementById("wms-label-print-css");
        if (printStyle) {
          printStyle.textContent = printCss.replace(
            "@page{size:100mm 50mm;margin:0}",
            format === "50x50"
              ? "@page{size:50mm 50mm;margin:0}"
              : "@page{size:100mm 50mm;margin:0}"
          );
        }

        if (description) {
          description.textContent = format === "50x50"
            ? list.length + " label · 50 × 50 mm · Square · QR saja tanpa teks"
            : list.length + " label · 100 × 50 mm · Landscape · QR dan informasi unit";
        }
      }

      if (select) {
        select.addEventListener("change", applySelectedLabelFormat);
      }

      if (printButton) {
        printButton.addEventListener("click", function() {
          applySelectedLabelFormat();
          printWindow.focus();
          printWindow.print();
        });
      }

      applySelectedLabelFormat();
      printWindow.focus();
    }).catch(function(error) {
      try { printWindow.close(); } catch (closeError) {}
      showAssetToast(error.message || "QR Code gagal dibuat.", "error");
    });
  }

  function renderAssetMovementTable() {
    const body = document.getElementById("asset-movement-body");
    if (!body) return;
    body.replaceChildren();
    const movements = assetUiState.catalog && Array.isArray(assetUiState.catalog.recentMovements) ? assetUiState.catalog.recentMovements : [];
    if (!movements.length) { const row = document.createElement("tr"); const cell = document.createElement("td"); cell.colSpan = 9; cell.className = "wms-asset-empty"; cell.textContent = "Belum ada pergerakan unit."; row.appendChild(cell); body.appendChild(row); return; }
    movements.forEach(function(movement) {
      const row = document.createElement("tr");
      appendTextCell(row, movement.moved_at || "-");
      const noCell = document.createElement("td"); const no = document.createElement("span"); no.className = "primary-text"; no.textContent = movement.movement_no || "-"; noCell.appendChild(no); const trx = document.createElement("span"); trx.className = "secondary-text"; trx.textContent = movement.transaction_id ? "Transaction linked" : "No transaction"; noCell.appendChild(trx); row.appendChild(noCell);
      const unitCell = document.createElement("td"); const uc = document.createElement("span"); uc.className = "primary-text"; uc.textContent = movement.unit_code || "-"; unitCell.appendChild(uc); const item = document.createElement("span"); item.className = "secondary-text"; item.textContent = movement.item_name || movement.item_code || ""; unitCell.appendChild(item); row.appendChild(unitCell);
      appendTextCell(row, movement.movement_type || "-");
      appendTextCell(row, movement.from_location_name || movement.from_custodian_name || "-");
      appendTextCell(row, movement.to_location_name || movement.to_custodian_name || "-");
      const statusCell = document.createElement("td"); const badge = document.createElement("span"); badge.className = "wms-asset-badge " + (movement.to_status || ""); badge.textContent = assetStatusLabels[movement.to_status] || movement.to_status || "-"; statusCell.appendChild(badge); row.appendChild(statusCell);
      appendTextCell(row, movement.movement_reason || "-");
      appendTextCell(row, movement.recorded_by || "-");
      body.appendChild(row);
    });
  }

  function openAssetReceivingModal() {
    if (!assetUiState.catalog) { showAssetToast("Data unit belum selesai dimuat.", "warning"); return; }
    const items = assetUiState.catalog.items || [];
    const locations = assetUiState.catalog.locations || [];
    if (!items.length) { showAssetToast("Belum ada Item Individual Tracking yang aktif. Periksa Item Master.", "warning"); return; }
    if (!locations.length) { showAssetToast("Belum ada lokasi yang mendukung Individual Unit Transaction.", "warning"); return; }
    populateAssetSelect("asset-receive-item", items, "item_id", function(row) { return [row.item_code, row.item_name].filter(Boolean).join(" · "); }, "-- Select Individual Item --");
    populateAssetSelect("asset-receive-location", locations, "location_id", function(row) { return [row.location_code, row.location_name].filter(Boolean).join(" · "); }, "-- Select Receiving Location --");
    populateAssetSelect("asset-receive-person", assetUiState.catalog.persons || [], "person_id", function(row) { return [row.employee_id, row.person_name, row.department_name].filter(Boolean).join(" · "); }, "-- Optional --");
    document.getElementById("asset-acquisition-date").value = getTodayIsoDate();
    document.getElementById("asset-warranty-expiry").value = "";
    document.getElementById("asset-acquisition-cost").value = "";
    document.getElementById("asset-receive-reference").value = "";
    document.getElementById("asset-receive-reason").value = "Penerimaan unit dari Gudang Pusat";
    document.getElementById("asset-receive-notes").value = "";
    document.getElementById("asset-receive-condition").value = "GOOD";
    document.getElementById("asset-receive-error").classList.add("hidden");
    assetUiState.receivingRows = [];
    assetUiState.nextReceivingRowId = 1;
    addAssetReceivingRow();
    updateAssetSerialRequirement();
    document.getElementById("asset-receive-modal").classList.remove("hidden");
  }

  function populateAssetSelect(elementId, records, valueKey, labelBuilder, placeholder) {
    const select = document.getElementById(elementId);
    if (!select) return;
    select.replaceChildren();
    const first = document.createElement("option"); first.value = ""; first.textContent = placeholder || "-- Select --"; select.appendChild(first);
    (records || []).forEach(function(record) { const option = document.createElement("option"); option.value = record[valueKey]; option.textContent = labelBuilder(record); select.appendChild(option); });
  }

  function updateAssetSerialRequirement() {
    const itemId = document.getElementById("asset-receive-item").value;
    const item = (assetUiState.catalog && assetUiState.catalog.items || []).find(function(row) { return row.item_id === itemId; });
    const required = Boolean(item && item.serial_required);
    const hint = document.getElementById("asset-serial-hint");
    if (hint) hint.textContent = required ? "Serial Number wajib diisi untuk setiap unit pada item ini." : "Serial Number opsional untuk item ini. Asset Tag tetap harus unik jika diisi.";
    renderAssetReceivingRows();
  }

  function addAssetReceivingRow() {
    if (assetUiState.receivingRows.length >= 100) { showAssetReceiveError("Maksimal 100 unit per satu kali receiving."); return; }
    assetUiState.receivingRows.push({ id: assetUiState.nextReceivingRowId++, serial_number: "", asset_tag: "", notes: "" });
    renderAssetReceivingRows();
  }

  function renderAssetReceivingRows() {
    const container = document.getElementById("asset-receive-rows");
    if (!container) return;
    container.replaceChildren();
    const itemId = document.getElementById("asset-receive-item").value;
    const item = (assetUiState.catalog && assetUiState.catalog.items || []).find(function(row) { return row.item_id === itemId; });
    const serialRequired = Boolean(item && item.serial_required);
    assetUiState.receivingRows.forEach(function(unit, index) {
      const row = document.createElement("div"); row.className = "wms-asset-unit-row";
      const number = document.createElement("span"); number.className = "row-no"; number.textContent = String(index + 1).padStart(2, "0"); row.appendChild(number);
      const serial = document.createElement("input"); serial.type = "text"; serial.placeholder = serialRequired ? "Serial Number *" : "Serial Number"; serial.required = serialRequired; serial.maxLength = 120; serial.value = unit.serial_number; serial.setAttribute("aria-label", "Serial Number " + (index + 1)); serial.addEventListener("input", function() { unit.serial_number = serial.value; }); row.appendChild(serial);
      const tag = document.createElement("input"); tag.type = "text"; tag.placeholder = "Asset Tag"; tag.maxLength = 120; tag.value = unit.asset_tag; tag.setAttribute("aria-label", "Asset Tag " + (index + 1)); tag.addEventListener("input", function() { unit.asset_tag = tag.value; }); row.appendChild(tag);
      const notes = document.createElement("input"); notes.className = "unit-notes"; notes.type = "text"; notes.placeholder = "Unit notes"; notes.maxLength = 500; notes.value = unit.notes; notes.setAttribute("aria-label", "Unit notes " + (index + 1)); notes.addEventListener("input", function() { unit.notes = notes.value; }); row.appendChild(notes);
      const remove = document.createElement("button"); remove.type = "button"; remove.textContent = "×"; remove.title = "Remove unit row"; remove.disabled = assetUiState.receivingRows.length <= 1; remove.addEventListener("click", function() { assetUiState.receivingRows = assetUiState.receivingRows.filter(function(entry) { return entry.id !== unit.id; }); renderAssetReceivingRows(); }); row.appendChild(remove);
      container.appendChild(row);
    });
  }

  function saveAssetReceiving(event) {
    event.preventDefault();
    if (assetUiState.isReceiving) return;
    const form = document.getElementById("asset-receive-form");
    if (!form.reportValidity()) return;
    const payload = {
      item_id: document.getElementById("asset-receive-item").value,
      to_location_id: document.getElementById("asset-receive-location").value,
      received_by_person_id: document.getElementById("asset-receive-person").value,
      acquisition_date: document.getElementById("asset-acquisition-date").value,
      acquisition_cost: document.getElementById("asset-acquisition-cost").value,
      warranty_expiry: document.getElementById("asset-warranty-expiry").value,
      condition_status: document.getElementById("asset-receive-condition").value,
      reference_no: document.getElementById("asset-receive-reference").value,
      movement_reason: document.getElementById("asset-receive-reason").value,
      notes: document.getElementById("asset-receive-notes").value,
      units: assetUiState.receivingRows.map(function(row) { return { serial_number: row.serial_number, asset_tag: row.asset_tag, notes: row.notes }; })
    };
    if (!payload.units.length) { showAssetReceiveError("Minimal satu unit harus ditambahkan."); return; }
    setAssetReceivingBusy(true);
    google.script.run
      .withSuccessHandler(function(result) {
        setAssetReceivingBusy(false);
        if (!result || !result.ok) { showAssetReceiveError("Receiving unit gagal. Respons backend tidak valid."); return; }
        closeAssetModal("receive");
        showAssetToast(result.message || "Unit berhasil diterima.", result.auditLogged === false ? "warning" : "success");
        loadAssetCatalog(false);
      })
      .withFailureHandler(function(error) { setAssetReceivingBusy(false); showAssetReceiveError(getAppErrorMessage(error)); })
      .receiveIndividualUnits(payload);
  }

  function setAssetReceivingBusy(busy) {
    assetUiState.isReceiving = busy;
    const button = document.getElementById("asset-receive-submit");
    if (button) { button.disabled = busy; button.textContent = busy ? "Receiving..." : "Receive & Register Units"; }
    document.querySelectorAll('[data-asset-close="receive"]').forEach(function(el) { el.disabled = busy; });
  }

  function showAssetReceiveError(message) {
    const error = document.getElementById("asset-receive-error");
    if (!error) return;
    error.textContent = message;
    error.classList.remove("hidden");
  }

  function openAssetUnitDetails(unitId) {
    const requestId = ++assetUiState.detailRequestId;
    const modal = document.getElementById("asset-detail-modal");
    const content = document.getElementById("asset-detail-content");
    const moveButton = document.getElementById("asset-detail-move");
    content.innerHTML = '<div class="wms-asset-loading">Memuat detail dan riwayat unit...</div>';
    moveButton.disabled = true;
    modal.classList.remove("hidden");
    google.script.run
      .withSuccessHandler(function(result) {
        if (requestId !== assetUiState.detailRequestId) return;
        showAssetUnitDetailsResult(result);
      })
      .withFailureHandler(function(error) {
        if (requestId !== assetUiState.detailRequestId) return;
        content.textContent = getAppErrorMessage(error);
      })
      .getIndividualUnitDetails({ unit_id: unitId });
  }

  function showAssetUnitDetailsResult(result) {
    const content = document.getElementById("asset-detail-content");
    const modal = document.getElementById("asset-detail-modal");
    const moveButton = document.getElementById("asset-detail-move");
    if (!result || !result.ok || !result.unit) {
      content.textContent = "Detail unit tidak ditemukan.";
      modal.classList.remove("hidden");
      moveButton.disabled = true;
      return;
    }
    assetUiState.activeUnit = result.unit;
    renderAssetUnitDetails(result);
    moveButton.disabled = result.unit.unit_status === "DISPOSED";
    modal.classList.remove("hidden");
  }

  function setAssetQrScanStatus(message, type) {
    const status = document.getElementById("asset-qr-scan-status");
    if (!status) return;
    status.className = "wms-asset-scan-status" + (type ? " " + type : "");
    status.textContent = message;
  }

  function submitAssetQrScan() {
    if (assetUiState.isScanning) return;

    const input = document.getElementById("asset-qr-scan-input");
    const submit = document.getElementById("asset-qr-scan-submit");
    if (!input) return;

    const scannedValue = String(input.value || "")
      .replace(/[\r\n]+/g, "")
      .trim();

    if (!scannedValue) {
      setAssetQrScanStatus("QR belum terbaca. Scan label aset atau ketik QR Content.", "error");
      input.focus();
      return;
    }

    if (typeof google === "undefined" || !google.script || !google.script.run) {
      setAssetQrScanStatus("Koneksi Google Apps Script tidak tersedia. Muat ulang WMS lalu coba lagi.", "error");
      input.focus();
      return;
    }

    assetUiState.isScanning = true;
    const requestId = ++assetUiState.scanRequestId;

    if (submit) {
      submit.disabled = true;
      submit.textContent = "Mencari...";
    }
    input.disabled = true;
    setAssetQrScanStatus("Memeriksa QR dan mengambil detail unit...", "busy");

    function isCurrentRequest() {
      return requestId === assetUiState.scanRequestId;
    }

    function releaseScanControls() {
      if (assetUiState.scanTimeoutId) {
        window.clearTimeout(assetUiState.scanTimeoutId);
        assetUiState.scanTimeoutId = null;
      }
      assetUiState.isScanning = false;
      const currentInput = document.getElementById("asset-qr-scan-input");
      const currentSubmit = document.getElementById("asset-qr-scan-submit");
      if (currentInput) currentInput.disabled = false;
      if (currentSubmit) {
        currentSubmit.disabled = false;
        currentSubmit.textContent = "Cari Unit";
      }
      return currentInput;
    }

    // A backend call that never responds must not lock the scan field forever.
    // Incrementing scanRequestId makes any late callback from this request harmless.
    assetUiState.scanTimeoutId = window.setTimeout(function() {
      if (!isCurrentRequest()) return;
      const currentInput = releaseScanControls();
      assetUiState.scanRequestId++;
      setAssetQrScanStatus(
        "Server WMS belum merespons dalam 30 detik. Periksa Apps Script > Executions, lalu scan ulang.",
        "error"
      );
      if (currentInput) {
        currentInput.focus();
        currentInput.select();
      }
    }, 30000);

    try {
      google.script.run
        .withSuccessHandler(function(result) {
          if (!isCurrentRequest()) return;
          const currentInput = releaseScanControls();
          if (currentPage !== "assets") return;

          if (!result || !result.ok || !result.unit) {
            setAssetQrScanStatus("Respons pencarian QR tidak valid. Periksa eksekusi Apps Script.", "error");
            if (currentInput) currentInput.focus();
            return;
          }

          if (currentInput) currentInput.value = "";
          setAssetQrScanStatus(
            "QR cocok: " + (result.unit.unit_code || "unit") + " · detail aset dibuka.",
            "success"
          );
          showAssetUnitDetailsResult(result);
        })
        .withFailureHandler(function(error) {
          if (!isCurrentRequest()) return;
          const currentInput = releaseScanControls();
          if (currentPage !== "assets") return;
          setAssetQrScanStatus(getAppErrorMessage(error), "error");
          if (currentInput) {
            currentInput.focus();
            currentInput.select();
          }
        })
        .getIndividualUnitByQrToken({ qr_content: scannedValue });
    } catch (error) {
      if (!isCurrentRequest()) return;
      const currentInput = releaseScanControls();
      assetUiState.scanRequestId++;
      setAssetQrScanStatus(getAppErrorMessage(error), "error");
      if (currentInput) currentInput.focus();
    }
  }

  function renderAssetUnitDetails(result) {
    const unit = result.unit;
    const content = document.getElementById("asset-detail-content");
    document.getElementById("asset-detail-title").textContent = unit.unit_code || "Unit Details";
    document.getElementById("asset-detail-subtitle").textContent = [unit.item_code, unit.item_name].filter(Boolean).join(" · ");
    const cells = [
      ["Item Type", unit.item_type], ["Unit Status", assetStatusLabels[unit.unit_status] || unit.unit_status], ["Condition", unit.condition_status],
      ["Serial Number", unit.serial_number || "-"], ["Asset Tag", unit.asset_tag || "-"], ["Location", [unit.current_location_code, unit.current_location_name].filter(Boolean).join(" · ") || "-"],
      ["Custodian", unit.current_custodian_name || "-"], ["Acquisition Date", unit.acquisition_date || "-"], ["Acquisition Cost", unit.acquisition_cost ? formatTransactionNumber(unit.acquisition_cost) : "-"],
      ["Warranty Expiry", unit.warranty_expiry || "-"], ["Created At", unit.created_at || "-"], ["Created By", unit.created_by || "-"]
    ];
    let html = '<div class="wms-asset-detail-grid">';
    cells.forEach(function(cell) { html += '<div class="wms-asset-detail-cell"><span>' + escapeAssetHtml(cell[0]) + '</span><strong>' + escapeAssetHtml(cell[1] || "-") + '</strong></div>'; });
    html += '</div>';
    html += '<div class="wms-asset-qr-panel">';
    html += '<div class="wms-asset-qr-preview" id="asset-detail-qr-preview"><div class="wms-asset-qr-placeholder">GENERATING QR...</div></div>';
    html += '<div class="wms-asset-qr-meta"><div class="eyebrow">UNIT QR IDENTIFIER</div><h3>' + escapeAssetHtml(unit.unit_code || "Individual Unit") + '</h3>';
    html += '<p>Scan QR ini untuk mengenali unit secara spesifik. QR tetap sama meskipun unit berpindah lokasi atau custodian.</p>';
    html += '<code id="asset-qr-token-value">WMSUNIT:' + escapeAssetHtml(unit.qr_token || "-") + '</code>';
    html += '<div class="wms-asset-qr-actions"><button type="button" class="wms-asset-btn secondary small" id="asset-copy-qr-token">Copy QR Content</button></div></div></div>';
    html += '<div class="wms-asset-section-title">Movement History · ' + (result.movements || []).length + ' records</div>';
    html += '<div class="wms-asset-history-wrap"><table class="wms-asset-history"><thead><tr><th>Moved At</th><th>Movement No.</th><th>Type</th><th>From</th><th>To</th><th>Status</th><th>Reason</th></tr></thead><tbody id="asset-detail-history-body"></tbody></table></div>';
    if (unit.notes) html += '<div class="wms-asset-section-title">Notes</div><div class="wms-asset-current-unit">' + escapeAssetHtml(unit.notes) + '</div>';
    content.innerHTML = html;
    const copy = document.getElementById("asset-copy-qr-token");
    if (copy) copy.addEventListener("click", function() { copyAssetText("WMSUNIT:" + (unit.qr_token || "")); });
    const printButton = document.getElementById("asset-print-current-label");
    if (printButton) printButton.disabled = !unit.qr_token;
    renderAssetUnitQr(unit);
    const body = document.getElementById("asset-detail-history-body");
    const history = Array.isArray(result.movements) ? result.movements : [];
    if (!history.length) { const row = document.createElement("tr"); const cell = document.createElement("td"); cell.colSpan = 7; cell.textContent = "Belum ada riwayat pergerakan."; row.appendChild(cell); body.appendChild(row); }
    history.forEach(function(entry) {
      const row = document.createElement("tr");
      appendTextCell(row, entry.moved_at || "-"); appendTextCell(row, entry.movement_no || "-"); appendTextCell(row, entry.movement_type || "-"); appendTextCell(row, [entry.from_location_name, entry.from_custodian_name].filter(Boolean).join(" / ") || "-"); appendTextCell(row, [entry.to_location_name, entry.to_custodian_name].filter(Boolean).join(" / ") || "-"); appendTextCell(row, assetStatusLabels[entry.to_status] || entry.to_status || "-"); appendTextCell(row, entry.movement_reason || "-"); body.appendChild(row);
    });
  }

  function openAssetMovementModal(unit) {
    if (!unit || unit.unit_status === "DISPOSED") { showAssetToast("Unit DISPOSED tidak dapat diubah lagi.", "warning"); return; }
    assetUiState.activeUnit = unit;
    const typesByStatus = {
      IN_STOCK: ["TRANSFER", "ASSIGN", "CONDITION_CHANGE", "STATUS_CHANGE", "DISPOSAL"],
      ASSIGNED: ["TRANSFER", "ASSIGN", "RETURN", "CONDITION_CHANGE", "STATUS_CHANGE", "DISPOSAL"],
      IN_REPAIR: ["RETURN", "CONDITION_CHANGE", "STATUS_CHANGE", "DISPOSAL"],
      LOST: ["RECOVERED", "DISPOSAL"]
    };
    const labels = { TRANSFER: "Transfer Location", ASSIGN: "Assign Custodian", RETURN: "Return to Warehouse", CONDITION_CHANGE: "Change Condition", STATUS_CHANGE: "Change Status", RECOVERED: "Recover Lost Unit", DISPOSAL: "Dispose Unit" };
    const select = document.getElementById("asset-movement-type");
    select.replaceChildren();
    (typesByStatus[unit.unit_status] || []).forEach(function(type) { const option = document.createElement("option"); option.value = type; option.textContent = labels[type]; select.appendChild(option); });
    populateAssetSelect("asset-movement-location", assetUiState.catalog.locations || [], "location_id", function(row) { return [row.location_code, row.location_name].filter(Boolean).join(" · "); }, "-- Select Location --");
    populateAssetSelect("asset-movement-custodian", assetUiState.catalog.persons || [], "person_id", function(row) { return [row.employee_id, row.person_name, row.department_name].filter(Boolean).join(" · "); }, "-- Select Custodian --");
    populateAssetSelect("asset-movement-received-by", assetUiState.catalog.persons || [], "person_id", function(row) { return [row.employee_id, row.person_name].filter(Boolean).join(" · "); }, "-- Optional --");
    populateAssetSelect("asset-movement-status", assetUiState.catalog.unitStatuses.map(function(status) { return { value: status, label: assetStatusLabels[status] || status }; }), "value", function(row) { return row.label; }, "-- Select Status --");
    document.getElementById("asset-movement-status").value = "IN_REPAIR";
    document.getElementById("asset-movement-location").value = "";
    document.getElementById("asset-movement-custodian").value = "";
    document.getElementById("asset-movement-condition").value = "";
    document.getElementById("asset-movement-reason").value = "";
    document.getElementById("asset-movement-reference").value = "";
    document.getElementById("asset-movement-notes").value = "";
    document.getElementById("asset-movement-error").classList.add("hidden");
    document.getElementById("asset-movement-current-unit").textContent = [unit.unit_code, unit.item_name, "Status: " + (assetStatusLabels[unit.unit_status] || unit.unit_status), "Location: " + (unit.current_location_name || "-"), "Custodian: " + (unit.current_custodian_name || "-")].join(" | ");
    document.getElementById("asset-movement-subtitle").textContent = "Unit " + unit.unit_code + " · " + (unit.item_name || "");
    updateAssetMovementForm();
    document.getElementById("asset-detail-modal").classList.add("hidden");
    document.getElementById("asset-movement-modal").classList.remove("hidden");
  }

  function updateAssetMovementForm() {
    const type = document.getElementById("asset-movement-type").value;
    const status = document.getElementById("asset-movement-status").value;
    const locationWrap = document.getElementById("asset-movement-location-wrap");
    const custodianWrap = document.getElementById("asset-movement-custodian-wrap");
    const statusWrap = document.getElementById("asset-movement-status-wrap");
    const conditionWrap = document.getElementById("asset-movement-condition-wrap");
    const location = document.getElementById("asset-movement-location");
    const custodian = document.getElementById("asset-movement-custodian");
    const statusSelect = document.getElementById("asset-movement-status");
    const condition = document.getElementById("asset-movement-condition");
    const locationRequired = ["TRANSFER", "RECOVERED"].includes(type);
    const locationVisible = ["TRANSFER", "ASSIGN", "RETURN", "STATUS_CHANGE", "RECOVERED"].includes(type);
    locationWrap.classList.toggle("hidden", !locationVisible);
    document.getElementById("asset-movement-location-label").textContent = type === "RECOVERED" ? "Recovery Location *" : type === "RETURN" ? "Return Location" : type === "ASSIGN" ? "Assignment Location (optional)" : "Destination Location";
    location.required = locationRequired;
    custodianWrap.classList.toggle("hidden", !(type === "ASSIGN" || (type === "STATUS_CHANGE" && status === "ASSIGNED")));
    custodian.required = type === "ASSIGN" || (type === "STATUS_CHANGE" && status === "ASSIGNED");
    statusWrap.classList.toggle("hidden", type !== "STATUS_CHANGE");
    statusSelect.required = type === "STATUS_CHANGE";
    conditionWrap.classList.toggle("hidden", type !== "CONDITION_CHANGE");
    condition.required = type === "CONDITION_CHANGE";
  }

  function saveAssetMovement(event) {
    event.preventDefault();
    if (assetUiState.isMoving || !assetUiState.activeUnit) return;
    const form = document.getElementById("asset-movement-form");
    if (!form.reportValidity()) return;
    const type = document.getElementById("asset-movement-type").value;
    if (type === "DISPOSAL" && !window.confirm("Unit " + assetUiState.activeUnit.unit_code + " akan ditandai DISPOSED dan tidak dapat digunakan kembali. Lanjutkan?")) return;
    const newStatus = document.getElementById("asset-movement-status").value;
    if (type === "STATUS_CHANGE" && newStatus === "LOST" && !window.confirm("Unit akan ditandai LOST. Lanjutkan?")) return;
    if (type === "STATUS_CHANGE" && newStatus === "DISPOSED" && !window.confirm("Unit akan ditandai DISPOSED dan tidak dapat digunakan kembali. Lanjutkan?")) return;
    const payload = {
      unit_id: assetUiState.activeUnit.unit_id,
      movement_type: type,
      to_location_id: document.getElementById("asset-movement-location").value,
      to_custodian_person_id: document.getElementById("asset-movement-custodian").value,
      received_by_person_id: document.getElementById("asset-movement-received-by").value,
      to_status: document.getElementById("asset-movement-status").value,
      to_condition: document.getElementById("asset-movement-condition").value,
      movement_reason: document.getElementById("asset-movement-reason").value,
      reference_no: document.getElementById("asset-movement-reference").value,
      notes: document.getElementById("asset-movement-notes").value
    };
    setAssetMovementBusy(true);
    google.script.run
      .withSuccessHandler(function(result) {
        setAssetMovementBusy(false);
        if (!result || !result.ok) { showAssetMovementError("Movement gagal disimpan. Respons backend tidak valid."); return; }
        // Clear active unit first so closing the movement dialog does not reopen its old detail view.
        assetUiState.activeUnit = null;
        closeAssetModal("movement");
        showAssetToast(result.message || "Unit movement berhasil dicatat.", result.auditLogged === false ? "warning" : "success");
        loadAssetCatalog(false);
      })
      .withFailureHandler(function(error) { setAssetMovementBusy(false); showAssetMovementError(getAppErrorMessage(error)); })
      .recordIndividualUnitMovement(payload);
  }

  function setAssetMovementBusy(busy) {
    assetUiState.isMoving = busy;
    const button = document.getElementById("asset-movement-submit");
    if (button) { button.disabled = busy; button.textContent = busy ? "Saving..." : "Save Movement"; }
    document.querySelectorAll('[data-asset-close="movement"]').forEach(function(el) { el.disabled = busy; });
  }

  function showAssetMovementError(message) {
    const error = document.getElementById("asset-movement-error");
    if (!error) return;
    error.textContent = message;
    error.classList.remove("hidden");
  }

  function closeAssetModal(type) {
    const id = type === "receive" ? "asset-receive-modal" : type === "detail" ? "asset-detail-modal" : "asset-movement-modal";
    const modal = document.getElementById(id);
    if (!modal) return;
    if (type === "receive" && assetUiState.isReceiving) return;
    if (type === "movement" && assetUiState.isMoving) return;
    modal.classList.add("hidden");
    if (type === "detail" && currentPage === "assets") {
      const scanInput = document.getElementById("asset-qr-scan-input");
      if (scanInput) window.setTimeout(function() { scanInput.focus(); }, 80);
    }
    if (type === "movement" && assetUiState.activeUnit && assetUiState.activeUnit.unit_status !== "DISPOSED") {
      // Return to the current detail view after cancelling the movement dialog.
      const unitId = assetUiState.activeUnit.unit_id;
      if (unitId && currentPage === "assets") openAssetUnitDetails(unitId);
    }
  }

  function showAssetError(message) {
    const error = document.getElementById("asset-error");
    if (!error) return;
    error.textContent = message;
    error.classList.remove("hidden");
  }

  function showAssetToast(message, type) {
    const stack = document.getElementById("wms-asset-toast-stack");
    if (!stack) return;
    const toast = document.createElement("div");
    toast.className = "wms-asset-toast " + (type || "success");
    const text = document.createElement("span"); text.textContent = String(message || "Berhasil."); toast.appendChild(text);
    const close = document.createElement("button"); close.type = "button"; close.textContent = "×"; close.setAttribute("aria-label", "Close notification"); close.addEventListener("click", function() { toast.remove(); }); toast.appendChild(close);
    stack.appendChild(toast);
    window.setTimeout(function() { if (toast.parentNode) toast.remove(); }, 4500);
  }

  function escapeAssetHtml(value) {
    return String(value === null || value === undefined ? "" : value).replace(/[&<>"']/g, function(char) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char];
    });
  }

  function copyAssetText(value) {
    if (!value) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(value).then(function() { showAssetToast("QR Token berhasil disalin.", "success"); }).catch(function() { showAssetToast("Tidak dapat menyalin token dari browser ini.", "warning"); });
      return;
    }
    const area = document.createElement("textarea"); area.value = value; area.style.position = "fixed"; area.style.opacity = "0"; document.body.appendChild(area); area.select();
    try { document.execCommand("copy"); showAssetToast("QR Token berhasil disalin.", "success"); } catch (error) { showAssetToast("Tidak dapat menyalin token.", "warning"); }
    area.remove();
  }

  /* =========================================================
     19. PLACEHOLDER MODULES
  ========================================================= */

  function renderPlaceholderPage(page) {

    const definition = pageDefinitions[page];

    const content = document.getElementById(
      "page-content"
    );


    if (!definition || !content) {

      renderModuleError(
        "Halaman yang diminta tidak tersedia."
      );

      return;

    }


    const wrapper = document.createElement("section");

    wrapper.className = "placeholder-card";


    const icon = document.createElement("div");

    icon.className = "placeholder-icon";

    icon.textContent = definition.icon;


    const heading = document.createElement("h2");

    heading.textContent = definition.title;


    const description = document.createElement("p");

    description.textContent = definition.description;


    const notice = document.createElement("p");

    notice.textContent =
      "Modul ini akan dikembangkan pada tahap implementasi berikutnya.";


    const button = document.createElement("button");

    button.type = "button";

    button.className = "btn btn-secondary";

    button.textContent =
      "Kembali ke Dashboard";


    button.addEventListener(
      "click",
      function () {

        navigateTo("dashboard");

      }
    );


    wrapper.appendChild(icon);

    wrapper.appendChild(heading);

    wrapper.appendChild(description);

    wrapper.appendChild(notice);

    wrapper.appendChild(button);


    content.replaceChildren(wrapper);

  }


  /* =========================================================
     18. GENERAL MODULE ERROR
  ========================================================= */

  function renderModuleError(message) {

    const content = document.getElementById(
      "page-content"
    );


    if (!content) return;


    const wrapper = document.createElement("section");

    wrapper.className = "placeholder-card";


    const icon = document.createElement("div");

    icon.className = "placeholder-icon";

    icon.textContent = "⚠";


    const heading = document.createElement("h2");

    heading.textContent =
      "Module Loading Error";


    const description = document.createElement("p");

    description.textContent = message;


    const button = document.createElement("button");

    button.type = "button";

    button.className = "btn btn-secondary";

    button.textContent =
      "Back to Dashboard";


    button.addEventListener(
      "click",
      function () {

        navigateTo("dashboard");

      }
    );


    wrapper.appendChild(icon);

    wrapper.appendChild(heading);

    wrapper.appendChild(description);

    wrapper.appendChild(button);


    content.replaceChildren(wrapper);

  }


  /* =========================================================
     19. DEBUG INFORMATION
  ========================================================= */

  window.WMS_DEBUG = {

    getCurrentPage: function () {

      return currentPage;

    },


    getCurrentAdmin: function () {

      return currentAdmin
        ? {
            email: currentAdmin.email,
            displayName: currentAdmin.displayName,
            role: currentAdmin.role
          }
        : null;

    },


    checkMasterDataController: function () {

      return {

        templateExists:
          !!document.getElementById(
            "master-data-template"
          ),

        controllerExists:
          typeof window.initWmsMasterDataPage ===
          "function"

      };

    },

    getTransactionState: function () {

      return {

        currentPage: currentPage,

        catalogLoaded: !!transactionUiState.catalog,

        itemCount: transactionUiState.catalog
          ? (transactionUiState.catalog.items || []).length
          : 0,

        locationCount: transactionUiState.catalog
          ? (transactionUiState.catalog.locations || []).length
          : 0,

        recentTransactionCount: transactionUiState.catalog
          ? (transactionUiState.catalog.recentTransactions || []).length
          : 0

      };

    },

  };


  console.info(
    "WMS Application Controller v1.10.0 loaded."
  );


})();
