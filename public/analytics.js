// Umami v3.5: explicit manual pageviews/events; never delay navigation.
(() => {
  const origin = "https://kaori.cloud";
  const trackerUrl = "https://analytics.kaori.cloud/script.js";
  const configUrl = "/.well-known/kaori-analytics/config.json";
  const preference = "kaori-analytics-consent";
  if (location.origin !== origin || window.top !== window) return;

  const excludedRoute = /^\/(editorial-preview|review|search)(\/|$)/i;
  const routeAllowed = () => !excludedRoute.test(location.pathname);

  const browserOptOut = () =>
    navigator.globalPrivacyControl === true ||
    navigator.doNotTrack === "1" ||
    navigator.doNotTrack === "yes" ||
    window.doNotTrack === "1";

  const permitted = () => {
    try {
      return (
        routeAllowed() &&
        !browserOptOut() &&
        localStorage.getItem(preference) === "allow" &&
        !localStorage.getItem("umami.disabled")
      );
    } catch {
      return false;
    }
  };

  const configKeys = "enabled,hostname,schema,trackerUrl,websiteId";
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const validConfig = (value) =>
    value !== null &&
    typeof value === "object" &&
    Object.keys(value).sort().join(",") === configKeys &&
    value.schema === 1 &&
    value.enabled === true &&
    value.hostname === location.hostname &&
    value.trackerUrl === trackerUrl &&
    typeof value.websiteId === "string" &&
    uuid.test(value.websiteId);

  const referrerOrigin = () => {
    try {
      const referrer = new URL(document.referrer);
      const isWeb = ["http:", "https:"].includes(referrer.protocol);
      return isWeb && referrer.origin !== origin ? referrer.origin : "";
    } catch {
      return "";
    }
  };

  const eventNames = new Set([
    "open_application",
    "open_documentation",
    "open_github",
    "view_release",
  ]);
  let initialization;
  let activeWebsite;
  let lastPath;
  let ready = false;
  let runtimeConfig = null;
  let expiresAt = 0;
  let checking;

  const getConfig = () => {
    if (Date.now() < expiresAt) return Promise.resolve(runtimeConfig);
    checking ??= (async () => {
      const response = await fetch(configUrl, {
        cache: "no-store",
        credentials: "same-origin",
        redirect: "error",
        signal: AbortSignal.timeout(5000),
      });
      const contentType = response.headers.get("content-type");
      if (!response.ok || !contentType?.includes("application/json")) {
        return null;
      }
      const config = await response.json();
      return validConfig(config) ? config : null;
    })()
      .catch(() => null)
      .then((config) => {
        runtimeConfig = config;
        expiresAt = Date.now() + 60000;
        return config;
      })
      .finally(() => {
        checking = undefined;
      });
    return checking;
  };

  const canSend = () =>
    permitted() &&
    Date.now() < expiresAt &&
    runtimeConfig?.websiteId === activeWebsite &&
    !!activeWebsite;

  const initialize = async () => {
    if (!permitted()) return false;
    const config = await getConfig();
    if (!config || !permitted()) return false;
    if (activeWebsite && config.websiteId !== activeWebsite) return false;
    if (!initialization) {
      if (window.umami) return false;
      activeWebsite = config.websiteId;
      window.umamiConfig = {
        websiteId: activeWebsite,
        domains: [location.hostname],
        autoTrack: false,
        doNotTrack: true,
        excludeSearch: true,
        excludeHash: true,
        fetchCredentials: "omit",
        beforeSend: (type, payload) => {
          if (!canSend() || type !== "event") return null;
          if (payload.name !== undefined && !eventNames.has(payload.name)) return null;
          return {
            website: activeWebsite,
            hostname: location.hostname,
            url: location.pathname,
            referrer: referrerOrigin(),
            title: document.title,
            screen: `${screen.width}x${screen.height}`,
            language: navigator.language,
            ...(payload.name ? { name: payload.name } : {}),
          };
        },
      };
      initialization = new Promise((resolve) => {
        const script = document.createElement("script");
        script.src = trackerUrl;
        script.async = true;
        script.referrerPolicy = "no-referrer";
        script.onload = () => resolve(typeof window.umami?.track === "function");
        script.onerror = () => resolve(false);
        document.head.append(script);
      }).then((loaded) => {
        ready = loaded;
        return loaded;
      });
    }
    return initialization;
  };

  const track = (name) => {
    if (!ready || !canSend()) {
      if (permitted()) void initialize().catch(() => {});
      return;
    }
    try {
      Promise.resolve(window.umami.track(name)).catch(() => {});
    } catch {
      // Analytics must never interfere with page rendering or navigation.
    }
  };

  const pageview = async () => {
    if (!permitted()) {
      lastPath = undefined;
      return;
    }
    try {
      if (!(await initialize()) || !canSend() || lastPath === location.pathname) return;
      lastPath = location.pathname;
      track();
    } catch {
      // Missing, unavailable or invalid provider configuration is disabled.
    }
  };

  const eventFor = (href) => {
    try {
      const target = new URL(href, origin);
      if (target.origin === "https://app.kaori.cloud") return "open_application";
      if (target.origin === "https://docs.kaori.cloud") return "open_documentation";
      if (target.origin === "https://github.com" && /^\/OXY7O\//i.test(target.pathname)) {
        return /\/releases(?:\/|$)/.test(target.pathname) ? "view_release" : "open_github";
      }
    } catch {
      // Invalid links are not analytics events.
    }
  };

  // Preference reflects browser choice, not provider availability or collection state.
  const updatePreference = () => {
    const label = document.querySelector("[data-kaori-analytics-preference]");
    if (!label) return;
    let state = "Optional";
    try {
      if (browserOptOut() || localStorage.getItem("umami.disabled")) {
        state = "Disabled";
      } else if (localStorage.getItem(preference) === "allow") {
        state = "Allowed";
      } else if (localStorage.getItem(preference) === "deny") {
        state = "Disabled";
      }
    } catch {
      state = "Disabled";
    }
    label.textContent = state;
    const status = document.querySelector("[data-kaori-analytics-status]");
    if (status) {
      status.textContent = permitted() ? "Subject to activation." : "Analytics is off.";
    }
  };

  document.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;
    const choice = event.target.closest("[data-kaori-analytics-choice]");
    if (choice) {
      const value = choice.getAttribute("data-kaori-analytics-choice");
      const status = document.querySelector("[data-kaori-analytics-status]");
      if (value !== "allow" && value !== "deny") return;
      try {
        const previous = localStorage.getItem(preference);
        localStorage.setItem(preference, value);
        updatePreference();
        if (previous !== value) lastPath = undefined;
        if (value === "allow") void pageview();
      } catch {
        if (status) {
          status.textContent = "Could not save preference.";
        }
      }
      return;
    }
    const link = event.target.closest("a[href]");
    const name = link && eventFor(link.href);
    if (name) track(name);
  });

  window.addEventListener("kaori:analytics-route", () => {
    updatePreference();
    void pageview();
  });
  window.addEventListener("storage", updatePreference);
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) lastPath = undefined;
    updatePreference();
    void pageview();
  });
  updatePreference();
  void pageview();
})();
