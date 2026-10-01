const DEFAULT_SETTINGS = {
  enabled: true,
  autoSkip: true,
  hideAds: true,
  fastForwardAds: true,
  adsHandled: 0
};

async function load() {
  const data = await chrome.storage.local.get(DEFAULT_SETTINGS);

  document.getElementById("enabled").checked = data.enabled;
  document.getElementById("autoSkip").checked = data.autoSkip;
  document.getElementById("hideAds").checked = data.hideAds;
  document.getElementById("fastForwardAds").checked = data.fastForwardAds;

  document.getElementById("status").textContent =
    data.enabled
      ? `Active. Ads handled: ${data.adsHandled || 0}`
      : "Extension is currently disabled.";
}

async function saveSetting(id) {
  const checkbox = document.getElementById(id);
  await chrome.storage.local.set({ [id]: checkbox.checked });
  await load();
}

["enabled", "autoSkip", "hideAds", "fastForwardAds"].forEach((id) => {
  document.getElementById(id).addEventListener("change", () => saveSetting(id));
});

load();
