const DEFAULT_SETTINGS = {
  enabled: true,
  autoSkip: true,
  hideAds: true,
  fastForwardAds: true
};

let settings = { ...DEFAULT_SETTINGS };
let observer = null;
let intervalId = null;

const SKIP_SELECTORS = [
  ".ytp-ad-skip-button",
  ".ytp-ad-skip-button-modern",
  ".ytp-skip-ad-button",
  "button.ytp-ad-skip-button",
  "button[class*='skip'][class*='ad']"
];

const AD_CONTAINER_SELECTORS = [
  "ytd-display-ad-renderer",
  "ytd-promoted-sparkles-web-renderer",
  "ytd-promoted-video-renderer",
  "ytd-ad-slot-renderer",
  "ytd-in-feed-ad-layout-renderer",
  "ytd-banner-promo-renderer",
  "ytd-statement-banner-renderer",
  "ytm-promoted-sparkles-web-renderer",
  ".ytd-promoted-sparkles-web-renderer",
  ".ytd-display-ad-renderer",
  ".ytp-ad-overlay-container",
  ".ytp-ad-overlay-slot",
  ".ytp-ad-text-overlay",
  ".ytp-ad-player-overlay"
];

async function loadSettings() {
  try {
    const saved = await chrome.storage.local.get(DEFAULT_SETTINGS);
    settings = { ...DEFAULT_SETTINGS, ...saved };
  } catch (_) {}
}

function isVisible(el) {
  if (!el) return false;
  const style = getComputedStyle(el);
  const rect = el.getBoundingClientRect();
  return style.display !== "none" &&
         style.visibility !== "hidden" &&
         rect.width > 0 &&
         rect.height > 0;
}

async function incrementStat() {
  try {
    const data = await chrome.storage.local.get({ adsHandled: 0 });
    await chrome.storage.local.set({ adsHandled: (data.adsHandled || 0) + 1 });
  } catch (_) {}
}

function clickSkipButton() {
  if (!settings.enabled || !settings.autoSkip) return false;

  for (const selector of SKIP_SELECTORS) {
    const button = document.querySelector(selector);
    if (button && isVisible(button) && !button.disabled) {
      button.click();
      incrementStat();
      return true;
    }
  }
  return false;
}

function hideAdContainers() {
  if (!settings.enabled || !settings.hideAds) return;

  for (const selector of AD_CONTAINER_SELECTORS) {
    document.querySelectorAll(selector).forEach((el) => {
      el.style.setProperty("display", "none", "important");
      el.style.setProperty("visibility", "hidden", "important");
      el.setAttribute("data-yab-hidden", "true");
    });
  }

  document.querySelectorAll(
    "ytd-rich-item-renderer, ytd-video-renderer, ytd-compact-video-renderer"
  ).forEach((item) => {
    const text = (item.innerText || "").toLowerCase();
    if (
      text.includes("sponsored") ||
      text.includes("promoted") ||
      text.includes("advertisement")
    ) {
      item.style.setProperty("display", "none", "important");
      item.setAttribute("data-yab-hidden", "true");
    }
  });
}

function handlePlayerAd() {
  if (!settings.enabled) return;

  const player = document.querySelector(".html5-video-player");
  if (!player || !player.classList.contains("ad-showing")) return;

  if (clickSkipButton()) return;
  if (!settings.fastForwardAds) return;

  const video = document.querySelector("video.html5-main-video, video");
  if (!video) return;

  try {
    video.muted = true;
    video.playbackRate = 16;

    if (Number.isFinite(video.duration) && video.duration > 0.2) {
      video.currentTime = Math.max(0, video.duration - 0.1);
    }
  } catch (_) {}
}

function restoreNormalPlayback() {
  const player = document.querySelector(".html5-video-player");
  const video = document.querySelector("video.html5-main-video, video");
  if (!video) return;

  if (!player || !player.classList.contains("ad-showing")) {
    if (video.playbackRate === 16) {
      video.playbackRate = 1;
    }
  }
}

function runPass() {
  if (!settings.enabled) return;
  clickSkipButton();
  hideAdContainers();
  handlePlayerAd();
  restoreNormalPlayback();
}

function startObserver() {
  if (observer) observer.disconnect();

  observer = new MutationObserver(runPass);
  observer.observe(document.documentElement || document, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class", "style", "hidden", "aria-hidden"]
  });

  if (intervalId) clearInterval(intervalId);
  intervalId = setInterval(runPass, 1000);
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  for (const key of Object.keys(DEFAULT_SETTINGS)) {
    if (changes[key]) settings[key] = changes[key].newValue;
  }
  runPass();
});

(async () => {
  await loadSettings();
  startObserver();
  runPass();
})();
