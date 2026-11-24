(function () {
  "use strict";

  const cfg = window.WMS_CONFIG || {};
  const supabaseUrl = String(cfg.SUPABASE_URL || "").trim();
  const supabaseAnonKey = String(cfg.SUPABASE_ANON_KEY || "").trim();

  const isConfigured =
    Boolean(supabaseUrl) &&
    Boolean(supabaseAnonKey) &&
    !supabaseUrl.includes("YOUR_PROJECT_ID") &&
    !supabaseAnonKey.includes("YOUR_SUPABASE_ANON_KEY");

  let supabaseClient = null;
  if (isConfigured && window.supabase && typeof window.supabase.createClient === "function") {
    supabaseClient = window.supabase.createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
  }

  function formatRpcError(error) {
    if (!error) return new Error("Terjadi kesalahan pada server Supabase.");
    const msg = error.message || error.details || error.hint || String(error);
    return new Error(msg);
  }

  async function invokeRpc(fnName, params) {
    if (!isConfigured || !supabaseClient) {
      throw new Error(
        "Konfigurasi Supabase belum diisi. Edit file config.js dan masukkan SUPABASE_URL serta SUPABASE_ANON_KEY."
      );
    }

    const res = params !== undefined
      ? await supabaseClient.rpc(fnName, params)
      : await supabaseClient.rpc(fnName);

    if (res.error) {
      throw formatRpcError(res.error);
    }
    return res.data;
  }

  async function handleGetSessionInfo() {
    if (!isConfigured || !supabaseClient) {
      toggleLoginUi({ configured: false, needsLogin: false });
      return {
        authorized: false,
        message: "Konfigurasi Supabase belum diisi di config.js."
      };
    }

    const sessionRes = await supabaseClient.auth.getSession();
    if (sessionRes.error) {
      throw formatRpcError(sessionRes.error);
    }

    const session = sessionRes.data && sessionRes.data.session;
    if (!session) {
      toggleLoginUi({ configured: true, needsLogin: true });
      return {
        authorized: false,
        needsLogin: true,
        message: "Silakan login menggunakan akun Admin WMS."
      };
    }

    const data = await invokeRpc("wms_get_session_info");
    if (data && data.authorized) {
      toggleLoginUi({ configured: true, needsLogin: false, authorized: true });
    } else {
      toggleLoginUi({ configured: true, needsLogin: false, authorized: false });
    }
    return data;
  }

  function toggleLoginUi(state) {
    const loginBox = document.getElementById("login-form-box");
    const logoutWrongUserBtn = document.getElementById("auth-switch-account");
    const setupNote = document.getElementById("auth-setup-note");

    if (setupNote) {
      setupNote.classList.toggle("hidden", state.configured !== false);
    }
    if (loginBox) {
      loginBox.classList.toggle("hidden", !state.needsLogin);
    }
    if (logoutWrongUserBtn) {
      logoutWrongUserBtn.classList.toggle("hidden", !(!state.needsLogin && state.configured && !state.authorized));
    }
  }

  const RPC_HANDLERS = {
    getWmsSessionInfo: function () {
      return handleGetSessionInfo();
    },
    getWmsDashboardData: function () {
      return invokeRpc("wms_get_dashboard_data");
    },
    getMasterDataCatalog: function () {
      return invokeRpc("wms_get_master_data_catalog");
    },
    saveCategory: function (payload) {
      return invokeRpc("wms_save_category", { p_payload: payload || {} });
    },
    saveUom: function (payload) {
      return invokeRpc("wms_save_uom", { p_payload: payload || {} });
    },
    setMasterRecordActive: function (payload) {
      return invokeRpc("wms_set_master_record_active", { p_payload: payload || {} });
    },
    getLocationsCatalog: function () {
      return invokeRpc("wms_get_locations_catalog");
    },
    saveLocation: function (payload) {
      return invokeRpc("wms_save_location", { p_payload: payload || {} });
    },
    setLocationActive: function (payload) {
      return invokeRpc("wms_set_location_active", { p_payload: payload || {} });
    },
    getPersonsCatalog: function () {
      return invokeRpc("wms_get_persons_catalog");
    },
    savePerson: function (payload) {
      return invokeRpc("wms_save_person", { p_payload: payload || {} });
    },
    setPersonActive: function (payload) {
      return invokeRpc("wms_set_person_active", { p_payload: payload || {} });
    },
    getItemsCatalog: function () {
      return invokeRpc("wms_get_items_catalog");
    },
    saveItem: function (payload) {
      return invokeRpc("wms_save_item", { p_payload: payload || {} });
    },
    setItemActive: function (payload) {
      return invokeRpc("wms_set_item_active", { p_payload: payload || {} });
    },
    getInventoryFoundationCatalog: function () {
      return invokeRpc("wms_get_inventory_foundation_catalog");
    },
    getInventoryManagementCatalog: function () {
      return invokeRpc("wms_get_inventory_management_catalog");
    },
    getInventoryTransaction: function (payload) {
      return invokeRpc("wms_get_inventory_transaction", { p_id: (payload && payload.id) || "" });
    },
    createInventoryDraft: function (payload) {
      return invokeRpc("wms_create_inventory_draft", { p_payload: payload || {} });
    },
    postInventoryTransaction: function (payload) {
      return invokeRpc("wms_post_inventory_transaction", { p_id: (payload && payload.id) || "" });
    },
    cancelInventoryTransaction: function (payload) {
      return invokeRpc("wms_cancel_inventory_transaction", { p_id: (payload && payload.id) || "" });
    },
    rebuildInventoryBalances: function () {
      return invokeRpc("wms_rebuild_inventory_balances");
    },
    getIndividualUnitCatalog: function () {
      return invokeRpc("wms_get_individual_unit_catalog");
    },
    getIndividualUnitDetails: function (payload) {
      return invokeRpc("wms_get_individual_unit_details", {
        p_unit_id: (payload && (payload.unit_id || payload.id)) || ""
      });
    },
    getIndividualUnitByQrToken: function (payload) {
      return invokeRpc("wms_get_individual_unit_by_qr_token", {
        p_qr_content: (payload && (payload.qr_content || payload.qr_token || payload.value)) || ""
      });
    },
    receiveIndividualUnits: function (payload) {
      return invokeRpc("wms_receive_individual_units", { p_payload: payload || {} });
    },
    recordIndividualUnitMovement: function (payload) {
      return invokeRpc("wms_record_individual_unit_movement", { p_payload: payload || {} });
    }
  };

  function createRunner(onSuccess, onFailure) {
    const runner = {
      withSuccessHandler: function (fn) {
        return createRunner(typeof fn === "function" ? fn : null, onFailure);
      },
      withFailureHandler: function (fn) {
        return createRunner(onSuccess, typeof fn === "function" ? fn : null);
      }
    };

    Object.keys(RPC_HANDLERS).forEach(function (methodName) {
      runner[methodName] = function () {
        const args = arguments;
        Promise.resolve()
          .then(function () {
            return RPC_HANDLERS[methodName].apply(null, args);
          })
          .then(function (result) {
            if (onSuccess) onSuccess(result);
          })
          .catch(function (err) {
            if (onFailure) {
              onFailure(err);
            } else {
              console.error("WMS RPC Error (" + methodName + "):", err);
            }
          });
      };
    });

    return runner;
  }

  window.google = window.google || {};
  window.google.script = {
    get run() {
      return createRunner(null, null);
    }
  };

  window.WMS_AUTH = {
    isConfigured: isConfigured,
    client: supabaseClient,
    signInWithEmail: async function (email, password) {
      if (!supabaseClient) throw new Error("Supabase belum dikonfigurasi di config.js.");
      const res = await supabaseClient.auth.signInWithPassword({ email: email, password: password });
      if (res.error) throw formatRpcError(res.error);
      if (typeof window.wmsRetrySessionCheck === "function") {
        window.wmsRetrySessionCheck();
      }
      return res.data;
    },
    signInWithGoogle: async function () {
      if (!supabaseClient) throw new Error("Supabase belum dikonfigurasi di config.js.");
      const res = await supabaseClient.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin + window.location.pathname }
      });
      if (res.error) throw formatRpcError(res.error);
      return res.data;
    },
    signOut: async function () {
      if (!supabaseClient) return;
      await supabaseClient.auth.signOut();
      window.location.reload();
    }
  };

  if (supabaseClient) {
    supabaseClient.auth.onAuthStateChange(function (event) {
      if (event === "SIGNED_IN" && typeof window.wmsRetrySessionCheck === "function") {
        const shell = document.getElementById("app-shell");
        if (shell && shell.classList.contains("hidden")) {
          window.wmsRetrySessionCheck();
        }
      }
    });
  }

  function bindAuthForm() {
    const form = document.getElementById("login-form");
    const googleBtn = document.getElementById("login-google-btn");
    const switchBtn = document.getElementById("auth-switch-account");
    const logoutBtn = document.getElementById("sidebar-logout-btn");
    const authMessage = document.getElementById("auth-message");

    if (form) {
      form.addEventListener("submit", async function (e) {
        e.preventDefault();
        const emailEl = document.getElementById("login-email");
        const passEl = document.getElementById("login-password");
        const submitBtn = document.getElementById("login-submit-btn");
        if (!emailEl || !passEl) return;

        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = "Memproses...";
        }
        if (authMessage) {
          authMessage.className = "auth-message";
          authMessage.textContent = "Memverifikasi kredensial...";
        }

        try {
          await window.WMS_AUTH.signInWithEmail(emailEl.value.trim(), passEl.value);
        } catch (err) {
          if (authMessage) {
            authMessage.className = "auth-message auth-error";
            authMessage.textContent = err.message || "Login gagal.";
          }
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = "Masuk ke WMS";
          }
        }
      });
    }

    if (googleBtn) {
      googleBtn.addEventListener("click", async function () {
        try {
          await window.WMS_AUTH.signInWithGoogle();
        } catch (err) {
          if (authMessage) {
            authMessage.className = "auth-message auth-error";
            authMessage.textContent = err.message || "Google Sign-In gagal.";
          }
        }
      });
    }

    if (switchBtn) {
      switchBtn.addEventListener("click", function () {
        window.WMS_AUTH.signOut();
      });
    }

    if (logoutBtn) {
      logoutBtn.addEventListener("click", function () {
        window.WMS_AUTH.signOut();
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindAuthForm, { once: true });
  } else {
    bindAuthForm();
  }
})();
