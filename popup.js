// popup.js – Logique du popup

document.querySelectorAll(".btn-profile").forEach(btn => {
  btn.addEventListener("click", async () => {
    const profileId = btn.dataset.profile;

    // Récupère l'onglet actif
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;

    try {
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["profiles.js"] });
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["content.js"] });
      await chrome.tabs.sendMessage(tab.id, { action: "autofill", profileId });

      // Feedback visuel dans le popup
      btn.style.borderColor = "#4ade80";
      btn.style.color = "#4ade80";
      setTimeout(() => window.close(), 600);
    } catch (err) {
      btn.style.borderColor = "#f87171";
      console.error(err);
    }
  });
});

document.getElementById("btn-options").addEventListener("click", () => {
  chrome.tabs.create({ url: chrome.runtime.getURL("options.html") });
  window.close();
});
