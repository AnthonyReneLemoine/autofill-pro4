// background.js – Service Worker de l'extension AutoFill Pro

// ── Données des profils (dupliquées ici pour le service worker) ───────────────
const PROFILE_DATA = {
  perso: {
    prenom: "Jean", firstname: "Jean",
    nom: "Dupont", lastname: "Dupont",
    nom_complet: "Jean Dupont", fullname: "Jean Dupont",
    civilite: "M.", genre: "homme",
    date_naissance: "01/01/1990", birthdate: "01/01/1990",
    lieu_naissance: "France",
    email: "jean.dupont@example.com",
    telephone: "06 00 00 00 00", mobile: "06 00 00 00 00",
    adresse: "10 rue Exemple", address: "10 rue Exemple",
    adresse2: "",
    ville: "Paris", city: "Paris",
    code_postal: "75000", zipcode: "75000",
    pays: "France", country: "France",
    region: "Île-de-France", departement: "Paris",
    conjoint_prenom: "Marie", conjoint_nom: "Durand", conjoint_email: ""
  },
  pro: {
    prenom: "Jean", firstname: "Jean",
    nom: "Dupont", lastname: "Dupont",
    nom_complet: "Jean Dupont", fullname: "Jean Dupont",
    civilite: "M.",
    email: "jean.dupont.pro@example.com",
    telephone: "06 00 00 00 00",
    organisation: "Entreprise Exemple",
    organization: "Entreprise Exemple",
    entreprise: "Entreprise Exemple",
    company: "Entreprise Exemple",
    service: "Service Exemple",
    poste: "Employé",
    fonction: "Employé",
    siret: "000 000 000 00000",
    adresse: "Entreprise Exemple", address: "Entreprise Exemple",
    ville: "Paris", city: "Paris",
    code_postal: "75000", zipcode: "75000",
    pays: "France", country: "France",
    region: "Île-de-France", departement: "Paris",
    employeur: "Entreprise Exemple",
    statut: "Salarié",
    grade: "Employé"
  }
};

// ── Constantes ───────────────────────────────────────────────────────────────
const SNIPPET_MENU_PREFIX = "autofill-snippet-";
const MAX_SNIPPET_MENUS   = 50;
const LABEL_MAX_LEN       = 40;

// ── Initialisation ───────────────────────────────────────────────────────────
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get("customProfiles", (result) => {
    if (!result.customProfiles) {
      chrome.storage.local.set({ customProfiles: PROFILE_DATA });
    } else {
      const cp = result.customProfiles;
      chrome.storage.local.set({
        customProfiles: {
          perso: Object.assign({}, PROFILE_DATA.perso, cp.perso),
          pro:   Object.assign({}, PROFILE_DATA.pro,   cp.pro)
        }
      });
    }
  });
  buildAllMenus();
});

chrome.runtime.onStartup.addListener(() => { buildAllMenus(); });

// ── Construction de tous les menus ───────────────────────────────────────────
async function buildAllMenus() {
  await chrome.contextMenus.removeAll();

  chrome.contextMenus.create({ id: "autofill-root", title: "🖊️ AutoFill – Remplir le formulaire", contexts: ["page", "editable"] });
  chrome.contextMenus.create({ id: "autofill-perso", parentId: "autofill-root", title: "👤 Profil Personnel", contexts: ["page", "editable"] });
  chrome.contextMenus.create({ id: "autofill-pro", parentId: "autofill-root", title: "🏛️ Profil Professionnel (Entreprise Exemple / Entreprise Exemple)", contexts: ["page", "editable"] });
  chrome.contextMenus.create({ id: "autofill-sep1", parentId: "autofill-root", type: "separator", contexts: ["page", "editable"] });
  chrome.contextMenus.create({ id: "autofill-snippets-root", parentId: "autofill-root", title: "📋 Insérer un snippet", contexts: ["editable"] });

  await buildSnippetSubMenus();

  chrome.contextMenus.create({ id: "autofill-sep2", parentId: "autofill-root", type: "separator", contexts: ["page", "editable"] });
  chrome.contextMenus.create({ id: "autofill-manage", parentId: "autofill-root", title: "⚙️ Gérer les profils & snippets…", contexts: ["page", "editable"] });
}

// ── Sous-menu snippets ───────────────────────────────────────────────────────
async function buildSnippetSubMenus() {
  const snippets = await loadSnippets();

  if (snippets.length === 0) {
    chrome.contextMenus.create({ id: "autofill-snippets-empty", parentId: "autofill-snippets-root", title: "(aucun snippet — configurez dans Options)", enabled: false, contexts: ["editable"] });
    return;
  }

  let count = 0;
  for (const snippet of snippets) {
    if (count >= MAX_SNIPPET_MENUS) break;
    let label;
    if (snippet.key && snippet.value) {
      const valPreview = snippet.value.substring(0, 28) + (snippet.value.length > 28 ? "…" : "");
      label = `${snippet.key}  →  ${valPreview}`;
    } else {
      const text = snippet.value || snippet.key;
      label = text.substring(0, LABEL_MAX_LEN) + (text.length > LABEL_MAX_LEN ? "…" : "");
    }
    chrome.contextMenus.create({ id: `${SNIPPET_MENU_PREFIX}${count}`, parentId: "autofill-snippets-root", title: label, contexts: ["editable"] });
    count++;
  }
}

// ── Parse snippets ───────────────────────────────────────────────────────────
function parseSnippets(text) {
  const result = [];
  for (let line of text.split("\n")) {
    line = line.trim();
    if (!line || line.startsWith("#")) continue;
    const eqIdx = line.indexOf("=");
    if (eqIdx > 0) {
      result.push({ key: line.substring(0, eqIdx).trim(), value: line.substring(eqIdx + 1).trim() });
    } else {
      result.push({ key: "", value: line });
    }
  }
  return result;
}

// ── Chargement snippets ──────────────────────────────────────────────────────
async function loadSnippets() {
  return new Promise(resolve => {
    chrome.storage.local.get("snippetsText", async (result) => {
      let text = result.snippetsText;
      if (!text) {
        try { const resp = await fetch(chrome.runtime.getURL("snippets.txt")); text = await resp.text(); }
        catch { text = ""; }
      }
      resolve(parseSnippets(text || ""));
    });
  });
}

// ── Rebuild complet ──────────────────────────────────────────────────────────
async function rebuildSnippetMenus() {
  await chrome.contextMenus.removeAll();
  await buildAllMenus();
}

// ── Clics ────────────────────────────────────────────────────────────────────
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab?.id) return;
  if (info.menuItemId === "autofill-perso") {
    injectAndFill(tab.id, "perso");
  } else if (info.menuItemId === "autofill-pro") {
    injectAndFill(tab.id, "pro");
  } else if (info.menuItemId === "autofill-manage") {
    chrome.tabs.create({ url: chrome.runtime.getURL("options.html") });
  } else if (info.menuItemId.startsWith(SNIPPET_MENU_PREFIX)) {
    const idx = parseInt(info.menuItemId.replace(SNIPPET_MENU_PREFIX, ""), 10);
    const snippets = await loadSnippets();
    const snippet = snippets[idx];
    if (snippet) injectAndInsertSnippet(tab.id, snippet.value || snippet.key);
  }
});

// ── Injection profil ─────────────────────────────────────────────────────────
async function injectAndFill(tabId, profileId) {
  try {
    await chrome.scripting.executeScript({ target: { tabId }, files: ["profiles.js"] });
    await chrome.scripting.executeScript({ target: { tabId }, files: ["content.js"] });
    await chrome.tabs.sendMessage(tabId, { action: "autofill", profileId });
  } catch (err) { console.error("AutoFill – Erreur profil :", err); }
}

// ── Injection snippet ────────────────────────────────────────────────────────
async function injectAndInsertSnippet(tabId, value) {
  try {
    await chrome.scripting.executeScript({ target: { tabId }, files: ["content.js"] });
    await chrome.tabs.sendMessage(tabId, { action: "insertSnippet", value });
  } catch (err) { console.error("AutoFill – Erreur snippet :", err); }
}

// ── Messages ─────────────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "snippetsUpdated") {
    rebuildSnippetMenus().then(() => sendResponse({ ok: true }));
    return true;
  }
});
