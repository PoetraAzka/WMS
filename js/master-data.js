
/***************************************************************
 * WMS - MASTER DATA FRONTEND
 * Version : 1.5.0
 *
 * Modules:
 * - Categories
 * - Unit of Measurement
 * - Locations
 * - Persons
 * - Items
 ***************************************************************/

(function () {

  "use strict";


  /* =========================================================
     01. APPLICATION STATE
  ========================================================= */

  let activeTab = "categories";

  let isSaving = false;

  let toastContainer = null;

  let masterData = {

    categories: [],

    uoms: [],

    locations: [],

    persons: [],

    items: []

  };


  const LOCATION_TYPES = [

    {
      value: "WAREHOUSE",
      label: "Warehouse"
    },

    {
      value: "ZONE",
      label: "Zone"
    },

    {
      value: "RACK",
      label: "Rack"
    },

    {
      value: "RECEIVING",
      label: "Receiving Area"
    },

    {
      value: "OPERATIONAL_AREA",
      label: "Operational Area"
    },

    {
      value: "QUARANTINE",
      label: "Quarantine"
    },

    {
      value: "TRANSIT",
      label: "Transit"
    }

  ];


  const LOCATION_PARENT_RULES = {

    WAREHOUSE: [],

    ZONE: ["WAREHOUSE"],

    RACK: ["ZONE"],

    RECEIVING: [
      "WAREHOUSE",
      "ZONE"
    ],

    OPERATIONAL_AREA: [
      "WAREHOUSE",
      "ZONE"
    ],

    QUARANTINE: [
      "WAREHOUSE",
      "ZONE"
    ],

    TRANSIT: ["WAREHOUSE"]

  };


  const ITEM_TYPES = [

    {
      value: "CONSUMABLE",
      label: "Consumable",
      trackingMethod: "QUANTITY"
    },

    {
      value: "NON_CONSUMABLE",
      label: "Non-Consumable",
      trackingMethod: "INDIVIDUAL"
    },

    {
      value: "FIXED_ASSET",
      label: "Fixed Asset",
      trackingMethod: "INDIVIDUAL"
    }

  ];


  /* =========================================================
     02. INITIALIZATION
  ========================================================= */

  function initWmsMasterDataPage() {

    activeTab = "categories";

    isSaving = false;


    ensurePersonsTabButton();

    ensureItemsTabButton();

    bindTabEvents();

    bindSearchEvent();

    bindAddEvent();

    bindRefreshEvent();

    bindModalEvents();


    updateMasterHeading();

    loadMasterData();

  }


  window.initWmsMasterDataPage =
    initWmsMasterDataPage;


  /* =========================================================
     03. LOAD MASTER DATA
  ========================================================= */

  function loadMasterData(options) {

    options = options || {};

    setLoading(true);
    hidePageNotice();

    const loadErrors = [];
    let categoriesAndUomLoaded = false;

    google.script.run
      .withSuccessHandler(function(result) {

        if (!result || !result.ok) {
          loadErrors.push("Categories dan UOM gagal dimuat.");
        } else {
          masterData.categories = result.categories || [];
          masterData.uoms = result.uoms || [];
          categoriesAndUomLoaded = true;
        }

        loadLocations();

      })
      .withFailureHandler(function(error) {

        loadErrors.push("Categories dan UOM: " + getErrorMessage(error));
        loadLocations();

      })
      .getMasterDataCatalog();


    function loadLocations() {

      google.script.run
        .withSuccessHandler(function(result) {

          if (!result || !result.ok) {
            masterData.locations = [];
            loadErrors.push("Locations gagal dimuat.");
          } else {
            masterData.locations = result.locations || [];
          }

          loadPersons();

        })
        .withFailureHandler(function(error) {

          masterData.locations = [];
          loadErrors.push("Locations: " + getErrorMessage(error));
          loadPersons();

        })
        .getLocationsCatalog();

    }


    function loadPersons() {

      google.script.run
        .withSuccessHandler(function(result) {

          if (!result || !result.ok) {
            masterData.persons = [];
            loadErrors.push("Persons gagal dimuat.");
          } else {
            masterData.persons = result.persons || [];
          }

          loadItems();

        })
        .withFailureHandler(function(error) {

          masterData.persons = [];
          loadErrors.push("Persons: " + getErrorMessage(error));
          loadItems();

        })
        .getPersonsCatalog();

    }


    function loadItems() {

      google.script.run
        .withSuccessHandler(function(result) {

          if (!result || !result.ok) {
            masterData.items = [];
            loadErrors.push("Items gagal dimuat.");
          } else {
            masterData.items = result.items || [];
          }

          finishLoading();

        })
        .withFailureHandler(function(error) {

          masterData.items = [];
          loadErrors.push("Items: " + getErrorMessage(error));
          finishLoading();

        })
        .getItemsCatalog();

    }


    function finishLoading() {

      setLoading(false);
      renderMasterTable();

      if (loadErrors.length) {
        showPageNotice(
          loadErrors.join(" "),
          categoriesAndUomLoaded ? "warning" : "error"
        );
        return;
      }

      if (options.notifyOnSuccess === true) {
        showToast(
          "Data Master berhasil diperbarui.",
          "success"
        );
      }

    }

  }


  function setLoading(isLoading) {

    const reload = document.getElementById(
      "master-reload"
    );

    const add = document.getElementById(
      "master-add-button"
    );


    if (reload) {

      reload.disabled = isLoading;

      reload.textContent = isLoading
        ? "Loading..."
        : "↻ Refresh";

    }


    if (add) {

      add.disabled = isLoading;

    }

  }


  /* =========================================================
     04. DYNAMIC PERSONS TAB
  ========================================================= */

  function ensurePersonsTabButton() {

    if (document.querySelector('[data-master-tab="persons"]')) {
      return;
    }

    const existingTabs = document.querySelectorAll("[data-master-tab]");
    if (!existingTabs.length) {
      throw new Error("Tab Master Data tidak ditemukan.");
    }

    const reference = existingTabs[existingTabs.length - 1];
    const button = reference.cloneNode(false);

    button.type = "button";
    button.dataset.masterTab = "persons";
    button.textContent = "Persons";
    button.classList.remove("active");
    button.setAttribute("aria-label", "Persons");

    reference.parentNode.appendChild(button);

  }


  function ensureItemsTabButton() {

    if (document.querySelector('[data-master-tab="items"]')) {
      return;
    }

    const existingTabs = document.querySelectorAll("[data-master-tab]");
    if (!existingTabs.length) {
      throw new Error("Tab Master Data tidak ditemukan.");
    }

    const reference = existingTabs[existingTabs.length - 1];
    const button = reference.cloneNode(false);

    button.type = "button";
    button.dataset.masterTab = "items";
    button.textContent = "Items";
    button.classList.remove("active");
    button.setAttribute("aria-label", "Items");

    reference.parentNode.appendChild(button);

  }


  /* =========================================================
     05. TAB NAVIGATION
  ========================================================= */

  function bindTabEvents() {

    document
      .querySelectorAll("[data-master-tab]")
      .forEach(function (button) {

        button.addEventListener(
          "click",
          function () {

            activeTab =
              button.dataset.masterTab;


            document
              .querySelectorAll("[data-master-tab]")
              .forEach(function (tab) {

                tab.classList.toggle(
                  "active",
                  tab === button
                );

              });


            hidePageNotice();

            updateMasterHeading();

            renderMasterTable();

          }
        );

      });

  }


  function updateMasterHeading() {

    const title = document.getElementById(
      "master-list-title"
    );

    const addButton = document.getElementById(
      "master-add-button"
    );


    const config = {

      categories: {
        title: "Categories",
        button: "+ Add Category",
        placeholder: "Search category..."
      },

      uom: {
        title: "Unit of Measurement",
        button: "+ Add UOM",
        placeholder: "Search UOM..."
      },

      locations: {
        title: "Warehouse Locations",
        button: "+ Add Location",
        placeholder: "Search location..."
      },

      persons: {
        title: "Persons",
        button: "+ Add Person",
        placeholder: "Search person..."
      },

      items: {
        title: "Items",
        button: "+ Add Item",
        placeholder: "Search item..."
      }

    };


    const current = config[activeTab];


    title.textContent = current.title;

    addButton.textContent = current.button;


    document.getElementById(
      "master-search"
    ).placeholder = current.placeholder;

  }


  /* =========================================================
     05. SEARCH
  ========================================================= */

  function bindSearchEvent() {

    document
      .getElementById("master-search")
      .addEventListener(
        "input",
        renderMasterTable
      );

  }


  /* =========================================================
     06. ADD / REFRESH
  ========================================================= */

  function bindAddEvent() {

    document
      .getElementById("master-add-button")
      .addEventListener(
        "click",
        function () {

          openModal(null);

        }
      );

  }


  function bindRefreshEvent() {

    document
      .getElementById("master-reload")
      .addEventListener(
        "click",
        function() {

          loadMasterData({
            notifyOnSuccess: true
          });

        }
      );

  }


  /* =========================================================
     07. TABLE RENDERING
  ========================================================= */

  function renderMasterTable() {

    const head = document.getElementById(
      "master-table-head"
    );

    const body = document.getElementById(
      "master-table-body"
    );

    const total = document.getElementById(
      "master-total"
    );


    head.replaceChildren();

    body.replaceChildren();


    const query = String(
      document.getElementById("master-search").value || ""
    )
      .trim()
      .toLowerCase();


    let records = [];

    let headers = [];


    if (activeTab === "categories") {

      records = masterData.categories;

      headers = [
        "Category Code",
        "Category Name",
        "Description",
        "Status",
        "Actions"
      ];

    }


    else if (activeTab === "uom") {

      records = masterData.uoms;

      headers = [
        "UOM Code",
        "Unit Name",
        "Status",
        "Actions"
      ];

    }


    else if (activeTab === "locations") {

      records = masterData.locations;

      headers = [
        "Location Code",
        "Location Name",
        "Type",
        "Parent Location",
        "Storage Capability",
        "Status",
        "Actions"
      ];

    }


    else if (activeTab === "persons") {

      records = masterData.persons;

      headers = [
        "Employee ID",
        "Person Name",
        "Department",
        "Vendor",
        "Person Type",
        "Status",
        "Actions"
      ];

    }


    else if (activeTab === "items") {

      records = masterData.items;

      headers = [
        "Item Code",
        "Item Name",
        "Category",
        "Item Type",
        "Tracking Method",
        "Base UOM",
        "Minimum Stock",
        "Reorder Quantity",
        "Serial Required",
        "Status",
        "Actions"
      ];

    }


    // Filter search.
    const filtered = records.filter(function (record) {

      const values = Object.values(record);

      return values.some(function (value) {

        return String(value || "")
          .toLowerCase()
          .includes(query);

      });

    });


    // Create table headers.
    const headerRow = document.createElement("tr");


    headers.forEach(function (label) {

      const th = document.createElement("th");

      th.textContent = label;

      headerRow.appendChild(th);

    });


    head.appendChild(headerRow);


    total.textContent =
      filtered.length + " records";


    // Empty state.
    if (filtered.length === 0) {

      const row = document.createElement("tr");

      const cell = document.createElement("td");

      cell.colSpan = headers.length;

      cell.className = "empty-state";


      if (records.length === 0) {

        if (activeTab === "locations") {
          cell.textContent = "Belum ada lokasi. Tambahkan Warehouse utama terlebih dahulu.";
        } else if (activeTab === "persons") {
          cell.textContent = "Belum ada person. Silakan tambahkan person pertama.";
        } else if (activeTab === "items") {
          cell.textContent = "Belum ada item. Tambahkan Category dan UOM terlebih dahulu, lalu buat item pertama.";
        } else {
          cell.textContent = "Belum ada data. Silakan tambahkan data pertama.";
        }

      } else {

        cell.textContent =
          "Tidak ada data yang cocok.";

      }


      row.appendChild(cell);

      body.appendChild(row);

      return;

    }


    filtered.forEach(function (record) {

      const row = document.createElement("tr");


      if (activeTab === "categories") {

        appendCell(row, record.category_code);

        appendCell(row, record.category_name);

        appendCell(row, record.description || "-");

      }


      else if (activeTab === "uom") {

        appendCell(row, record.uom_code);

        appendCell(row, record.uom_name);

      }


      else if (activeTab === "locations") {

        appendCell(row, record.location_code);

        appendCell(row, record.location_name);

        appendCell(
          row,
          getLocationTypeLabel(record.location_type)
        );

        appendCell(
          row,
          record.parent_location_name || "-"
        );

        appendCell(
          row,
          getLocationCapability(record)
        );

      }


      else if (activeTab === "persons") {

        appendCell(row, record.employee_id || "-");
        appendCell(row, record.person_name);
        appendCell(row, record.department_name || "-");
        appendCell(row, record.vendor_name || "-");
        appendCell(row, record.person_type || "-");

      }


      else if (activeTab === "items") {

        appendCell(row, record.item_code);
        appendCell(row, record.item_name);
        appendCell(row, record.category_name || "-");
        appendCell(row, getItemTypeLabel(record.item_type));
        appendCell(row, getTrackingMethodLabel(record.tracking_method));
        appendCell(row, record.base_uom_name || "-");
        appendCell(row, formatItemNumber(record.minimum_stock));
        appendCell(row, formatItemNumber(record.reorder_quantity));
        appendCell(row, record.serial_required ? "Yes" : "No");

      }


      // Status.
      const isActive =
        record.is_active === true;

      appendStatusCell(
        row,
        isActive
      );


      // Action buttons.
      const actionCell = document.createElement("td");

      const group = document.createElement("div");

      group.className = "master-action-group";


      const edit = createActionButton(
        "Edit",
        "",
        function () {

          openModal(record);

        }
      );


      const toggle = createActionButton(
        isActive ? "Deactivate" : "Activate",
        isActive ? "danger" : "success",
        function () {

          toggleRecordStatus(
            record,
            isActive
          );

        }
      );


      group.appendChild(edit);

      group.appendChild(toggle);

      actionCell.appendChild(group);

      row.appendChild(actionCell);


      body.appendChild(row);

    });

  }


  function appendCell(row, value) {

    const cell = document.createElement("td");

    cell.textContent = value || "-";

    row.appendChild(cell);

  }


  function appendStatusCell(row, isActive) {

    const cell = document.createElement("td");

    const badge = document.createElement("span");


    badge.className =
      "master-status " +
      (isActive ? "active" : "inactive");


    badge.textContent =
      isActive ? "ACTIVE" : "INACTIVE";


    cell.appendChild(badge);

    row.appendChild(cell);

  }


  function createActionButton(
    label,
    extraClass,
    callback
  ) {

    const button = document.createElement("button");

    button.type = "button";

    button.className =
      "master-action " + extraClass;

    button.textContent = label;

    button.addEventListener(
      "click",
      callback
    );

    return button;

  }


  /* =========================================================
     08. DISPLAY HELPERS
  ========================================================= */

  function getLocationTypeLabel(type) {

    const found = LOCATION_TYPES.find(
      function (item) {

        return item.value === type;

      }
    );


    return found
      ? found.label
      : type || "-";

  }


  function getLocationCapability(location) {

    const quantity =
      location.allow_quantity_stock === true;

    const individual =
      location.allow_individual_units === true;


    if (quantity && individual) {
      return "Quantity + Individual";
    }

    if (quantity) {
      return "Quantity";
    }

    if (individual) {
      return "Individual";
    }

    return "Non-storage";

  }


  /* =========================================================
     09. MODAL EVENTS
  ========================================================= */

  function bindModalEvents() {

    document
      .getElementById("master-modal-close")
      .addEventListener(
        "click",
        closeModal
      );


    document
      .getElementById("master-modal-cancel")
      .addEventListener(
        "click",
        closeModal
      );


    document
      .getElementById("master-form")
      .addEventListener(
        "submit",
        saveMasterRecord
      );


    document
      .getElementById("master-modal")
      .addEventListener(
        "click",
        function (event) {

          if (event.target.id === "master-modal") {

            closeModal();

          }

        }
      );


    const form = document.getElementById(
      "master-form"
    );


    form.addEventListener(
      "input",
      hideModalNotice
    );

    form.addEventListener(
      "change",
      hideModalNotice
    );

  }


  /* =========================================================
     10. OPEN MODAL
  ========================================================= */

  function openModal(record) {

    const modal = document.getElementById(
      "master-modal"
    );

    const title = document.getElementById(
      "master-modal-title"
    );

    const description = document.getElementById(
      "master-modal-description"
    );

    const recordId = document.getElementById(
      "master-record-id"
    );

    const fields = document.getElementById(
      "master-form-fields"
    );


    record = record || null;


    hideModalNotice();

    hidePageNotice();

    isSaving = false;


    recordId.value = record

      ? getRecordId(record)

      : "";


    // CATEGORY FORM.
    if (activeTab === "categories") {

      buildCategoryForm(
        record,
        title,
        description,
        fields
      );

    }


    // UOM FORM.
    else if (activeTab === "uom") {

      buildUomForm(
        record,
        title,
        description,
        fields
      );

    }


    // LOCATION FORM.
    else if (activeTab === "locations") {

      buildLocationForm(
        record,
        title,
        description,
        fields
      );

    }


    // PERSON FORM.
    else if (activeTab === "persons") {

      buildPersonForm(
        record,
        title,
        description,
        fields
      );

    }


    // ITEM FORM.
    else if (activeTab === "items") {

      buildItemForm(
        record,
        title,
        description,
        fields
      );

    }


    modal.classList.remove("hidden");

  }


  function getRecordId(record) {

    if (activeTab === "categories") {
      return record.category_id;
    }

    if (activeTab === "uom") {
      return record.uom_id;
    }

    if (activeTab === "locations") {
      return record.location_id;
    }

    if (activeTab === "items") {
      return record.item_id;
    }

    return record.person_id;

  }


  /* =========================================================
     11. CATEGORY FORM
  ========================================================= */

  function buildCategoryForm(
    record,
    title,
    description,
    fields
  ) {

    title.textContent = record
      ? "Edit Category"
      : "Add Category";


    description.textContent =
      "Kelola informasi kategori barang.";


    fields.innerHTML = `

      <div class="master-field">

        <label for="category-name">
          Category Name *
        </label>

        <input
          id="category-name"
          type="text"
          maxlength="100"
          required
          autocomplete="off"
          placeholder="Contoh: Packaging Material">

      </div>


      <div class="master-field">

        <label for="category-description">
          Description
        </label>

        <textarea
          id="category-description"
          maxlength="500"
          placeholder="Keterangan kategori..."></textarea>

      </div>


      <div class="field-hint">
        Category Code dibuat otomatis oleh sistem.
      </div>

    `;


    if (record) {

      document.getElementById(
        "category-name"
      ).value = record.category_name || "";


      document.getElementById(
        "category-description"
      ).value = record.description || "";

    }

  }


  /* =========================================================
     12. UOM FORM
  ========================================================= */

  function buildUomForm(
    record,
    title,
    description,
    fields
  ) {

    title.textContent = record
      ? "Edit UOM"
      : "Add UOM";


    description.textContent =
      "Kelola satuan pengukuran barang.";


    fields.innerHTML = `

      <div class="master-field">

        <label for="uom-name">
          Unit Name *
        </label>

        <input
          id="uom-name"
          type="text"
          maxlength="40"
          required
          autocomplete="off"
          placeholder="Contoh: Roll">

      </div>


      <div class="field-hint">
        UOM Code dibuat otomatis oleh sistem.
      </div>

    `;


    if (record) {

      document.getElementById(
        "uom-name"
      ).value = record.uom_name || "";

    }

  }


  /* =========================================================
     13. PERSON FORM
  ========================================================= */

  function buildPersonForm(
    record,
    title,
    description,
    fields
  ) {

    title.textContent = record
      ? "Edit Person"
      : "Add Person";

    description.textContent =
      "Kelola identitas person yang dapat bertanggung jawab atas barang atau aset.";

    fields.innerHTML = `

      <div class="master-field">
        <label for="person-employee-id">Employee ID</label>
        <input
          id="person-employee-id"
          type="text"
          maxlength="80"
          autocomplete="off"
          placeholder="Contoh: Ops123456">
        <div class="field-hint">Opsional. Jika diisi, Employee ID harus unik.</div>
      </div>

      <div class="master-field">
        <label for="person-name">Person Name *</label>
        <input
          id="person-name"
          type="text"
          maxlength="150"
          required
          autocomplete="off"
          placeholder="Nama lengkap person">
      </div>

      <div class="master-field">
        <label for="person-department">Department Name</label>
        <input
          id="person-department"
          type="text"
          maxlength="120"
          autocomplete="off"
          placeholder="Nama departemen">
      </div>

      <div class="master-field">
        <label for="person-vendor">Vendor Name</label>
        <input
          id="person-vendor"
          type="text"
          maxlength="120"
          autocomplete="off"
          placeholder="Nama vendor (bila ada)">
      </div>

      <div class="master-field">
        <label for="person-type">Person Type *</label>
        <input
          id="person-type"
          type="text"
          maxlength="60"
          required
          autocomplete="off"
          placeholder="Contoh: EMPLOYEE, CONTRACTOR, VENDOR">
        <div class="field-hint">Gunakan istilah tipe person sesuai standar internal.</div>
      </div>

      <div class="field-hint">
        Person ID dibuat otomatis oleh sistem. Status awal person baru adalah ACTIVE.
      </div>

    `;

    if (record) {
      document.getElementById("person-employee-id").value = record.employee_id || "";
      document.getElementById("person-name").value = record.person_name || "";
      document.getElementById("person-department").value = record.department_name || "";
      document.getElementById("person-vendor").value = record.vendor_name || "";
      document.getElementById("person-type").value = record.person_type || "";
    }

  }


  /* =========================================================
     14. ITEM FORM
  ========================================================= */

  function buildItemForm(
    record,
    title,
    description,
    fields
  ) {

    title.textContent = record
      ? "Edit Item"
      : "Add Item";

    description.textContent =
      "Kelola identitas barang, kategori, metode tracking, dan parameter stok.";

    fields.innerHTML = `

      <div class="master-field">
        <label for="item-name">Item Name *</label>
        <input
          id="item-name"
          type="text"
          maxlength="150"
          required
          autocomplete="off"
          placeholder="Contoh: Stretch Film 50 cm">
      </div>

      <div class="master-field">
        <label for="item-category">Category *</label>
        <select
          id="item-category"
          required
          style="width:100%;padding:11px;border:1px solid #e2e8f0;border-radius:7px;font-size:12px;background:white;"></select>
      </div>

      <div class="master-field">
        <label for="item-type">Item Type *</label>
        <select
          id="item-type"
          required
          style="width:100%;padding:11px;border:1px solid #e2e8f0;border-radius:7px;font-size:12px;background:white;">
          <option value="">-- Select Item Type --</option>
          <option value="CONSUMABLE">Consumable</option>
          <option value="NON_CONSUMABLE">Non-Consumable</option>
          <option value="FIXED_ASSET">Fixed Asset</option>
        </select>
        <div class="field-hint">Consumable menggunakan Quantity Tracking. Non-Consumable dan Fixed Asset menggunakan Individual Tracking.</div>
      </div>

      <div class="master-field">
        <label for="item-tracking-method">Tracking Method</label>
        <input
          id="item-tracking-method"
          type="text"
          readonly
          aria-readonly="true"
          style="width:100%;padding:11px;border:1px solid #e2e8f0;border-radius:7px;font-size:12px;background:#f8fafc;color:#475569;">
        <div class="field-hint">Tracking Method ditentukan otomatis berdasarkan Item Type agar konsisten dengan aturan inventory.</div>
      </div>

      <div class="master-field">
        <label for="item-base-uom">Base UOM *</label>
        <select
          id="item-base-uom"
          required
          style="width:100%;padding:11px;border:1px solid #e2e8f0;border-radius:7px;font-size:12px;background:white;"></select>
      </div>

      <div class="master-field">
        <label for="item-brand">Brand</label>
        <input
          id="item-brand"
          type="text"
          maxlength="100"
          autocomplete="off"
          placeholder="Nama brand (opsional)">
      </div>

      <div class="master-field">
        <label for="item-specification">Specification</label>
        <textarea
          id="item-specification"
          maxlength="1000"
          placeholder="Ukuran, tipe, material, atau spesifikasi lain..."></textarea>
      </div>

      <div class="master-field">
        <label for="item-minimum-stock">Minimum Stock</label>
        <input
          id="item-minimum-stock"
          type="number"
          min="0"
          step="any"
          value="0"
          inputmode="decimal">
      </div>

      <div class="master-field">
        <label for="item-reorder-quantity">Reorder Quantity</label>
        <input
          id="item-reorder-quantity"
          type="number"
          min="0"
          step="any"
          value="0"
          inputmode="decimal">
      </div>

      <div class="master-field">
        <label for="item-serial-required">Serial Required</label>
        <div style="display:flex;align-items:center;gap:9px;min-height:38px;">
          <input
            id="item-serial-required"
            type="checkbox"
            style="width:16px;height:16px;margin:0;">
          <span style="font-size:12px;color:#475569;">Setiap unit wajib memiliki nomor serial unik</span>
        </div>
        <div class="field-hint">Hanya berlaku untuk Individual Tracking.</div>
      </div>

      <div class="field-hint">
        Item Code dan Item ID dibuat otomatis oleh sistem. Status item baru adalah ACTIVE.
      </div>

    `;

    const categorySelect = document.getElementById("item-category");
    const uomSelect = document.getElementById("item-base-uom");
    const typeSelect = document.getElementById("item-type");

    populateItemReferenceSelect(
      categorySelect,
      masterData.categories,
      "category_id",
      "category_name",
      record ? record.category_id : "",
      "Category"
    );

    populateItemReferenceSelect(
      uomSelect,
      masterData.uoms,
      "uom_id",
      "uom_name",
      record ? record.base_uom_id : "",
      "UOM"
    );

    if (record) {
      document.getElementById("item-name").value = record.item_name || "";
      typeSelect.value = record.item_type || "";
      document.getElementById("item-brand").value = record.brand || "";
      document.getElementById("item-specification").value = record.specification || "";
      document.getElementById("item-minimum-stock").value =
        record.minimum_stock === undefined ? 0 : record.minimum_stock;
      document.getElementById("item-reorder-quantity").value =
        record.reorder_quantity === undefined ? 0 : record.reorder_quantity;
      document.getElementById("item-serial-required").checked =
        record.serial_required === true;
    }

    typeSelect.addEventListener("change", updateItemTrackingPreview);
    updateItemTrackingPreview();

  }


  function populateItemReferenceSelect(
    select,
    records,
    idKey,
    nameKey,
    selectedId,
    label
  ) {

    select.replaceChildren();

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "-- Select " + label + " --";
    placeholder.disabled = true;
    placeholder.selected = true;
    select.appendChild(placeholder);

    const available = (records || []).filter(function(record) {
      return record.is_active === true || record[idKey] === selectedId;
    });

    available.forEach(function(record) {
      const option = document.createElement("option");
      option.value = record[idKey];
      option.textContent = record[nameKey] || record[idKey];
      option.selected = record[idKey] === selectedId;
      select.appendChild(option);
    });

    if (selectedId) {
      select.value = selectedId;
    }

    if (!available.length) {
      const empty = document.createElement("option");
      empty.value = "";
      empty.textContent = "Belum ada " + label + " aktif. Buat " + label + " terlebih dahulu.";
      empty.disabled = true;
      select.appendChild(empty);
    }

  }


  function updateItemTrackingPreview() {

    const typeSelect = document.getElementById("item-type");
    const trackingInput = document.getElementById("item-tracking-method");
    const serialCheckbox = document.getElementById("item-serial-required");

    if (!typeSelect || !trackingInput || !serialCheckbox) return;

    const selected = ITEM_TYPES.find(function(type) {
      return type.value === typeSelect.value;
    });

    trackingInput.value = selected
      ? getTrackingMethodLabel(selected.trackingMethod)
      : "";

    const serialAllowed = Boolean(selected && selected.trackingMethod === "INDIVIDUAL");
    serialCheckbox.disabled = !serialAllowed;

    if (!serialAllowed) {
      serialCheckbox.checked = false;
    }

  }


  function getItemTypeLabel(type) {

    const found = ITEM_TYPES.find(function(item) {
      return item.value === type;
    });

    return found ? found.label : type || "-";

  }


  function getTrackingMethodLabel(method) {

    if (method === "QUANTITY") return "Quantity";
    if (method === "INDIVIDUAL") return "Individual Unit";
    return method || "-";

  }


  function formatItemNumber(value) {

    const number = Number(value);
    if (!Number.isFinite(number)) return "0";

    return number.toLocaleString("id-ID", {
      maximumFractionDigits: 3
    });

  }


  /* =========================================================
     15. LOCATION FORM
  ========================================================= */

  function buildLocationForm(
    record,
    title,
    description,
    fields
  ) {

    const isEdit = Boolean(record);


    title.textContent = isEdit
      ? "Edit Location"
      : "Add Location";


    description.textContent =
      "Atur lokasi penyimpanan dan hierarki warehouse.";


    fields.innerHTML = `

      <div class="master-field">

        <label for="location-name">
          Location Name *
        </label>

        <input
          id="location-name"
          type="text"
          maxlength="100"
          required
          autocomplete="off"
          placeholder="Contoh: Rack A01">

      </div>


      <div class="master-field">

        <label for="location-type">
          Location Type *
        </label>

        <select
          id="location-type"
          required
          style="
            width:100%;
            padding:11px;
            border:1px solid #e2e8f0;
            border-radius:7px;
            font-size:12px;
            background:white;
          ">
        </select>

      </div>


      <div
        class="master-field"
        id="location-parent-wrapper">

        <label for="location-parent">
          Parent Location *
        </label>

        <select
          id="location-parent"
          required
          style="
            width:100%;
            padding:11px;
            border:1px solid #e2e8f0;
            border-radius:7px;
            font-size:12px;
            background:white;
          ">
        </select>

        <div class="field-hint">
          Pilih lokasi induk sesuai hierarki warehouse.
        </div>

      </div>


      <div class="master-field">

        <label for="location-notes">
          Notes
        </label>

        <textarea
          id="location-notes"
          maxlength="500"
          placeholder="Keterangan lokasi..."></textarea>

      </div>


      <div class="field-hint">
        Location Code dan hak penyimpanan akan ditentukan
        otomatis berdasarkan Location Type.
      </div>

    `;


    const nameInput = document.getElementById(
      "location-name"
    );


    const typeSelect = document.getElementById(
      "location-type"
    );


    const parentSelect = document.getElementById(
      "location-parent"
    );


    // Build type options.
    populateLocationTypes(
      typeSelect,
      record
    );


    // Build parent options.
    populateLocationParents(
      typeSelect.value,
      parentSelect,
      record ? record.parent_location_id : ""
    );


    if (record) {

      nameInput.value = record.location_name || "";

      document.getElementById(
        "location-notes"
      ).value = record.notes || "";


      // Structure is immutable after creation.
      typeSelect.disabled = true;

      parentSelect.disabled = true;


      document.getElementById(
        "location-parent-wrapper"
      ).querySelector(".field-hint").textContent =
        "Location Type dan Parent tidak dapat diubah setelah dibuat.";


    }


    // Rebuild parent list when creating a location.
    if (!record) {

      typeSelect.addEventListener(
        "change",
        function () {

          populateLocationParents(
            typeSelect.value,
            parentSelect,
            ""
          );

        }
      );

    }

  }


  /* =========================================================
     15. LOCATION TYPE OPTIONS
  ========================================================= */

  function populateLocationTypes(
    select,
    record
  ) {

    select.replaceChildren();


    const warehouseExists =
      masterData.locations.some(
        function(location) {

          return location.location_type === "WAREHOUSE";

        }
      );


    const placeholder = document.createElement("option");

    placeholder.value = "";

    placeholder.textContent =
      "-- Select Location Type --";

    placeholder.disabled = true;

    placeholder.selected = true;

    select.appendChild(placeholder);


    LOCATION_TYPES.forEach(function(type) {

      const option = document.createElement("option");

      option.value = type.value;

      option.textContent = type.label;


      if (
        type.value === "WAREHOUSE" &&
        warehouseExists &&
        !record
      ) {

        option.disabled = true;

        option.textContent =
          "Warehouse (already registered)";

      }


      select.appendChild(option);

    });


    if (record) {

      select.value = record.location_type;

    }

  }


  /* =========================================================
     16. LOCATION PARENT OPTIONS
  ========================================================= */

  function populateLocationParents(
    locationType,
    select,
    selectedId
  ) {

    select.replaceChildren();


    const wrapper = document.getElementById(
      "location-parent-wrapper"
    );


    // Warehouse is a root location.
    if (locationType === "WAREHOUSE") {

      wrapper.classList.add("hidden");

      select.required = false;

      select.disabled = true;

      select.value = "";

      return;

    }


    wrapper.classList.remove("hidden");

    select.required = true;

    select.disabled = false;


    const allowedParents =
      LOCATION_PARENT_RULES[locationType] || [];


    const options = masterData.locations.filter(
      function(location) {

        return allowedParents.includes(
          location.location_type
        ) && (
          location.is_active === true ||
          location.location_id === selectedId
        );

      }
    );


    const placeholder = document.createElement("option");

    placeholder.value = "";

    placeholder.textContent =
      "-- Select Parent Location --";

    placeholder.disabled = true;

    placeholder.selected = true;

    select.appendChild(placeholder);


    options.forEach(function(location) {

      const option = document.createElement("option");

      option.value = location.location_id;

      option.textContent =
        location.location_code +
        " - " +
        location.location_name;

      option.selected =
        location.location_id === selectedId;

      select.appendChild(option);

    });


    if (selectedId) {

      select.value = selectedId;

    }


    if (options.length === 0) {

      const emptyOption = document.createElement("option");

      emptyOption.value = "";

      emptyOption.textContent =
        "Belum ada parent location yang tersedia";

      emptyOption.disabled = true;

      select.appendChild(emptyOption);

    }

  }


  /* =========================================================
     17. CLOSE MODAL
  ========================================================= */

  function closeModal() {

    if (isSaving) {
      return;
    }


    document
      .getElementById("master-modal")
      .classList.add("hidden");


    document
      .getElementById("master-form")
      .reset();


    document.getElementById(
      "master-record-id"
    ).value = "";


    hideModalNotice();

  }


  /* =========================================================
     18. SAVE MASTER RECORD
  ========================================================= */

  function saveMasterRecord(event) {

    event.preventDefault();


    if (isSaving) {
      return;
    }


    const saveButton = document.getElementById(
      "master-save-button"
    );


    const id = document.getElementById(
      "master-record-id"
    ).value;


    hideModalNotice();

    isSaving = true;


    saveButton.disabled = true;

    saveButton.textContent =
      "Saving...";


    const runner = google.script.run


      .withSuccessHandler(function(result) {

        isSaving = false;

        saveButton.disabled = false;

        saveButton.textContent = "Save";


        if (!result || !result.ok) {

          showModalNotice(
            "Data gagal disimpan. Periksa kembali input.",
            "error"
          );

          return;

        }


        // Save succeeded.
        closeModalAfterSuccess();


        const entityLabel = getActiveMasterLabel();

        const successMessage = result.message || (
          id
            ? entityLabel + " berhasil diperbarui."
            : entityLabel + " berhasil ditambahkan."
        );


        if (result.auditLogged === false) {

          showToast(
            successMessage +
            " Data tersimpan, tetapi Audit Log gagal ditulis.",
            "warning"
          );

        } else {

          showToast(
            successMessage,
            "success"
          );

        }


        loadMasterData();

      })


      .withFailureHandler(function(error) {

        isSaving = false;

        saveButton.disabled = false;

        saveButton.textContent = "Save";


        // Error remains inside the modal.
        showModalNotice(
          getErrorMessage(error),
          "error"
        );

      });


    // CATEGORIES.
    if (activeTab === "categories") {

      runner.saveCategory({

        id: id,

        category_name: document.getElementById(
          "category-name"
        ).value,

        description: document.getElementById(
          "category-description"
        ).value

      });

    }


    // UOM.
    else if (activeTab === "uom") {

      runner.saveUom({

        id: id,

        uom_name: document.getElementById(
          "uom-name"
        ).value

      });

    }


    // PERSONS.
    else if (activeTab === "persons") {

      runner.savePerson({

        id: id,
        employee_id: document.getElementById("person-employee-id").value,
        person_name: document.getElementById("person-name").value,
        department_name: document.getElementById("person-department").value,
        vendor_name: document.getElementById("person-vendor").value,
        person_type: document.getElementById("person-type").value

      });

    }


    // ITEMS.
    else if (activeTab === "items") {

      runner.saveItem({

        id: id,
        item_name: document.getElementById("item-name").value,
        category_id: document.getElementById("item-category").value,
        item_type: document.getElementById("item-type").value,
        base_uom_id: document.getElementById("item-base-uom").value,
        brand: document.getElementById("item-brand").value,
        specification: document.getElementById("item-specification").value,
        minimum_stock: document.getElementById("item-minimum-stock").value,
        reorder_quantity: document.getElementById("item-reorder-quantity").value,
        serial_required: document.getElementById("item-serial-required").checked

      });

    }


    // LOCATIONS.
    else {

      runner.saveLocation({

        id: id,

        location_name: document.getElementById(
          "location-name"
        ).value,

        location_type: document.getElementById(
          "location-type"
        ).value,

        parent_location_id: document.getElementById(
          "location-parent"
        ).value,

        notes: document.getElementById(
          "location-notes"
        ).value

      });

    }

  }


  function closeModalAfterSuccess() {

    isSaving = false;


    document
      .getElementById("master-modal")
      .classList.add("hidden");


    document
      .getElementById("master-form")
      .reset();


    document.getElementById(
      "master-record-id"
    ).value = "";


    hideModalNotice();

  }


  /* =========================================================
     19. ACTIVATE / DEACTIVATE
  ========================================================= */

  function toggleRecordStatus(
    record,
    currentlyActive
  ) {

    let id;

    let name;

    let type;


    if (activeTab === "categories") {

      id = record.category_id;

      name = record.category_name;

      type = "CATEGORY";

    }

    else if (activeTab === "uom") {

      id = record.uom_id;

      name = record.uom_name;

      type = "UOM";

    }

    else if (activeTab === "locations") {

      id = record.location_id;

      name = record.location_name;

      type = "LOCATION";

    }

    else if (activeTab === "items") {

      id = record.item_id;

      name = record.item_name;

      type = "ITEM";

    }

    else {

      id = record.person_id;

      name = record.person_name;

      type = "PERSON";

    }


    const newStatus = !currentlyActive;


    const action = newStatus
      ? "mengaktifkan"
      : "menonaktifkan";


    if (
      !confirm(
        "Apakah kamu yakin ingin " +
        action + " \"" + name + "\"?"
      )
    ) {

      return;

    }


    const runner = google.script.run


      .withSuccessHandler(function(result) {

        if (!result || !result.ok) {

          showPageNotice(
            "Perubahan status gagal.",
            "error"
          );

          return;

        }


        const entityLabel = getMasterLabelByType(type);

        const statusMessage = result.message || (
          entityLabel + " berhasil " +
          (newStatus ? "diaktifkan." : "dinonaktifkan.")
        );


        if (result.auditLogged === false) {

          showToast(
            statusMessage +
            " Namun Audit Log gagal ditulis.",
            "warning"
          );

        } else {

          showToast(
            statusMessage,
            "success"
          );

        }


        loadMasterData();

      })


      .withFailureHandler(function(error) {

        showPageNotice(
          getErrorMessage(error),
          "error"
        );

      });


    if (type === "LOCATION") {

      runner.setLocationActive({

        id: id,

        isActive: newStatus

      });

    } else if (type === "PERSON") {

      runner.setPersonActive({

        id: id,

        isActive: newStatus

      });

    } else if (type === "ITEM") {

      runner.setItemActive({

        id: id,

        isActive: newStatus

      });

    } else {

      runner.setMasterRecordActive({

        type: type,

        id: id,

        isActive: newStatus

      });

    }

  }


  /* =========================================================
     20. MODAL NOTIFICATIONS
  ========================================================= */

  function showModalNotice(message, type) {

    const notice = document.getElementById(
      "master-modal-notice"
    );


    if (!notice) return;


    notice.className =
      "master-notice " + type;


    notice.textContent = message;


    notice.classList.remove("hidden");


    notice.setAttribute("tabindex", "-1");

    notice.focus();

  }


  function hideModalNotice() {

    const notice = document.getElementById(
      "master-modal-notice"
    );


    if (!notice) return;


    notice.classList.add("hidden");

    notice.textContent = "";

  }


  /* =========================================================
     21. TOAST NOTIFICATIONS
  ========================================================= */

  function getActiveMasterLabel() {

    if (activeTab === "categories") return "Category";

    if (activeTab === "uom") return "UOM";

    if (activeTab === "locations") return "Location";

    if (activeTab === "items") return "Item";

    return "Person";

  }


  function getMasterLabelByType(type) {

    if (type === "CATEGORY") return "Category";

    if (type === "UOM") return "UOM";

    if (type === "LOCATION") return "Location";

    if (type === "ITEM") return "Item";

    return "Person";

  }


  function ensureToastContainer() {

    if (toastContainer && document.body.contains(toastContainer)) {

      return toastContainer;

    }


    if (!document.getElementById("wms-master-toast-styles")) {

      const style = document.createElement("style");

      style.id = "wms-master-toast-styles";

      style.textContent = `
        #wms-master-toast-container {
          position: fixed;
          top: 22px;
          right: 22px;
          z-index: 10000;
          display: flex;
          flex-direction: column;
          gap: 10px;
          width: min(390px, calc(100vw - 32px));
          pointer-events: none;
        }

        .wms-master-toast {
          display: flex;
          align-items: flex-start;
          gap: 11px;
          padding: 14px 16px;
          border: 1px solid #bbf7d0;
          border-left: 4px solid #16a34a;
          border-radius: 10px;
          background: #f0fdf4;
          color: #166534;
          box-shadow: 0 10px 28px rgba(15, 23, 42, .16);
          font: 500 13px/1.5 Arial, sans-serif;
          pointer-events: auto;
          animation: wmsMasterToastIn .22s ease-out;
          overflow-wrap: anywhere;
        }

        .wms-master-toast.warning {
          border-color: #fde68a;
          border-left-color: #d97706;
          background: #fffbeb;
          color: #92400e;
        }

        .wms-master-toast.error {
          border-color: #fecaca;
          border-left-color: #dc2626;
          background: #fef2f2;
          color: #991b1b;
        }

        .wms-master-toast-icon {
          display: inline-flex;
          flex: 0 0 21px;
          width: 21px;
          height: 21px;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: rgba(22, 163, 74, .12);
          font-size: 13px;
          font-weight: 700;
        }

        .wms-master-toast.warning .wms-master-toast-icon {
          background: rgba(217, 119, 6, .13);
        }

        .wms-master-toast.error .wms-master-toast-icon {
          background: rgba(220, 38, 38, .12);
        }

        .wms-master-toast-message {
          flex: 1;
          min-width: 0;
        }

        .wms-master-toast-close {
          flex: 0 0 auto;
          margin: -4px -5px 0 0;
          padding: 2px 5px;
          border: 0;
          background: transparent;
          color: inherit;
          font-size: 18px;
          line-height: 1;
          cursor: pointer;
          opacity: .65;
        }

        .wms-master-toast-close:hover {
          opacity: 1;
        }

        .wms-master-toast.is-leaving {
          animation: wmsMasterToastOut .18s ease-in forwards;
        }

        @keyframes wmsMasterToastIn {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes wmsMasterToastOut {
          from { opacity: 1; transform: translateY(0); }
          to { opacity: 0; transform: translateY(-6px); }
        }

        @media (max-width: 600px) {
          #wms-master-toast-container {
            top: 12px;
            right: 12px;
            width: calc(100vw - 24px);
          }
        }
      `;

      document.head.appendChild(style);

    }


    toastContainer = document.getElementById(
      "wms-master-toast-container"
    );


    if (!toastContainer) {

      toastContainer = document.createElement("div");

      toastContainer.id = "wms-master-toast-container";

      toastContainer.setAttribute("aria-live", "polite");

      toastContainer.setAttribute("aria-atomic", "false");

      document.body.appendChild(toastContainer);

    }


    return toastContainer;

  }


  function showToast(message, type, duration) {

    const container = ensureToastContainer();

    const toastType = ["success", "warning", "error"].includes(type)
      ? type
      : "success";

    const toast = document.createElement("div");

    toast.className = "wms-master-toast " + toastType;

    toast.setAttribute("role", "status");


    const icon = document.createElement("span");

    icon.className = "wms-master-toast-icon";

    icon.setAttribute("aria-hidden", "true");

    icon.textContent = toastType === "success"
      ? "✓"
      : toastType === "warning"
        ? "!"
        : "×";


    const text = document.createElement("span");

    text.className = "wms-master-toast-message";

    text.textContent = String(message || "Proses berhasil.");


    const close = document.createElement("button");

    close.type = "button";

    close.className = "wms-master-toast-close";

    close.setAttribute("aria-label", "Tutup notifikasi");

    close.textContent = "×";


    let isRemoved = false;

    let removeTimer = null;


    function removeToast() {

      if (isRemoved) return;

      isRemoved = true;

      window.clearTimeout(removeTimer);

      toast.classList.add("is-leaving");

      window.setTimeout(function() {

        if (toast.parentNode) {

          toast.parentNode.removeChild(toast);

        }

      }, 190);

    }


    close.addEventListener("click", removeToast);

    toast.appendChild(icon);

    toast.appendChild(text);

    toast.appendChild(close);

    container.appendChild(toast);


    removeTimer = window.setTimeout(
      removeToast,
      Number(duration) > 0 ? Number(duration) : 3500
    );

  }


  /* =========================================================
     22. PAGE NOTIFICATIONS
  ========================================================= */

  function showPageNotice(message, type) {

    const notice = document.getElementById(
      "master-notice"
    );


    if (!notice) return;


    notice.className =
      "master-notice " + type;


    notice.textContent = message;


    notice.classList.remove("hidden");


    window.clearTimeout(
      showPageNotice.timeoutId
    );


    showPageNotice.timeoutId =
      window.setTimeout(
        hidePageNotice,
        5000
      );

  }


  function hidePageNotice() {

    const notice = document.getElementById(
      "master-notice"
    );


    if (!notice) return;


    notice.classList.add("hidden");

    notice.textContent = "";


    window.clearTimeout(
      showPageNotice.timeoutId
    );

  }


  /* =========================================================
     23. ERROR UTILITIES
  ========================================================= */

  function getErrorMessage(error) {

    if (
      error &&
      error.message
    ) {

      return String(error.message)
        .replace(/^Exception:\s*/i, "")
        .replace(/^Error:\s*/i, "");

    }


    if (typeof error === "string") {

      return error;

    }


    return "Terjadi kesalahan. Silakan coba kembali.";

  }


  /* =========================================================
     24. DEBUG
  ========================================================= */

  window.WMS_MASTER_DEBUG = {

    getActiveTab: function() {

      return activeTab;

    },

    getLocationCount: function() {

      return masterData.locations.length;

    },

    getPersonCount: function() {

      return masterData.persons.length;

    },

    getItemCount: function() {

      return masterData.items.length;

    },

    getItemTypes: function() {

      return ITEM_TYPES.map(function(item) {
        return item.value;
      });

    },

    getLocationTypes: function() {

      return LOCATION_TYPES.map(function(item) {

        return item.value;

      });

    }

  };


})();
