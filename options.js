// options.js – Gestion complète des Options AutoFill Pro
"use strict";

// ══════════════════════════════════════════════════════════════════════════════
// Navigation sidebar
// ══════════════════════════════════════════════════════════════════════════════
document.querySelectorAll(".nav-item").forEach(item => {
  item.addEventListener("click", () => {
    document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));
    document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
    item.classList.add("active");
    document.getElementById(`page-${item.dataset.page}`).classList.add("active");
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// Helpers
// ══════════════════════════════════════════════════════════════════════════════
function flash(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.opacity = "1";
  setTimeout(() => { el.style.opacity = "0"; }, 2200);
}

function countActiveSnippets(text) {
  return text.split("\n").filter(l => {
    const t = l.trim();
    return t && !t.startsWith("#");
  }).length;
}

function updateCount(text) {
  const n = countActiveSnippets(text);
  const el = document.getElementById("snippet-count");
  if (el) el.textContent = `${n} entrée${n > 1 ? "s" : ""} active${n > 1 ? "s" : ""}`;
}

// ══════════════════════════════════════════════════════════════════════════════
// Contenu par défaut de snippets.txt (fallback si storage vide)
// ══════════════════════════════════════════════════════════════════════════════
const DEFAULT_SNIPPETS_TEXT = `# AutoFill Pro – Snippets personnels
# Une info par ligne. Deux formats :
#   clé = valeur      → le menu affiche "clé" et insère "valeur"
#   texte libre       → le menu affiche et insère directement
# Les lignes commençant par # sont ignorées.

# ── Identité ─────────────────────────────────────────────────────
Prénom = Jean
Nom = Dupont
Nom complet = Jean Dupont
Date de naissance = 01/01/1990
Civilité = M.

# ── Adresse personnelle ──────────────────────────────────────────
Adresse = 10 rue Exemple
Code postal = 75000
Ville = Paris
Pays = France
Région = Île-de-France
Département = Paris

# ── Contact personnel ────────────────────────────────────────────
Email perso = jean.dupont@example.com
Téléphone =
Mobile =

# ── Professionnel ────────────────────────────────────────────────
Email pro = jean.dupont.pro@example.com
Employeur = Entreprise Exemple
Organisme = Entreprise Exemple
Adresse pro = Entreprise Exemple, Paris
Code postal pro = 75000
Ville pro = Paris
Poste = Employé
Statut = Salarié
Grade = Employé
Service = Service Exemple

# ── Textes libres ────────────────────────────────────────────────
Objet type demande = Demande de renseignements – Entreprise Exemple
Signature mail = Cordialement, Jean Dupont – Entreprise Exemple – Entreprise Exemple
`;

// ══════════════════════════════════════════════════════════════════════════════
// Chargement initial
// ══════════════════════════════════════════════════════════════════════════════
chrome.storage.local.get(["snippetsText", "customProfiles"], (result) => {

  // ── Snippets ──
  let text = result.snippetsText || DEFAULT_SNIPPETS_TEXT;
  const editor = document.getElementById("snippets-editor");
  if (editor) {
    editor.value = text;
    updateCount(text);
    editor.addEventListener("input", () => updateCount(editor.value));
  }

  // ── Profil perso ──
  const cp = result.customProfiles || {};
  if (cp.perso) {
    const fields = ["prenom","nom","civilite","date_naissance","email","telephone","mobile",
                    "adresse","adresse2","code_postal","ville","pays","region"];
    fields.forEach(k => {
      const el = document.getElementById(`p_${k}`);
      if (el && cp.perso[k] !== undefined) el.value = cp.perso[k];
    });
  }

  // ── Profil pro ──
  if (cp.pro) {
    const fields = ["prenom","nom","email","telephone","organisation","entreprise",
                    "poste","service","statut","siret","adresse","code_postal","ville","pays"];
    fields.forEach(k => {
      const el = document.getElementById(`pro_${k}`);
      if (el && cp.pro[k] !== undefined) el.value = cp.pro[k];
    });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// Enregistrement des snippets
// ══════════════════════════════════════════════════════════════════════════════
document.getElementById("btn-save-snippets")?.addEventListener("click", () => {
  const text = document.getElementById("snippets-editor").value;
  chrome.storage.local.set({ snippetsText: text }, () => {
    // Demande au background de reconstruire les menus
    chrome.runtime.sendMessage({ action: "snippetsUpdated" }, () => {
      flash("saved-snippets");
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// Import .txt
// ══════════════════════════════════════════════════════════════════════════════
function loadFile(file) {
  if (!file || !file.name.endsWith(".txt")) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    const text = e.target.result;
    const editor = document.getElementById("snippets-editor");
    if (editor) { editor.value = text; updateCount(text); }
  };
  reader.readAsText(file, "utf-8");
}

document.getElementById("btn-import")?.addEventListener("click", () => {
  document.getElementById("import-input").click();
});

document.getElementById("import-input")?.addEventListener("change", (e) => {
  loadFile(e.target.files[0]);
  e.target.value = ""; // reset pour pouvoir réimporter le même fichier
});

// ── Drag & Drop ──
const dropZone = document.getElementById("drop-zone");
if (dropZone) {
  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("drag-over");
  });
  dropZone.addEventListener("dragleave", () => dropZone.classList.remove("drag-over"));
  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("drag-over");
    loadFile(e.dataTransfer.files[0]);
  });
  dropZone.addEventListener("click", () => document.getElementById("import-input").click());
}

// ══════════════════════════════════════════════════════════════════════════════
// Export .txt
// ══════════════════════════════════════════════════════════════════════════════
document.getElementById("btn-export")?.addEventListener("click", () => {
  const text = document.getElementById("snippets-editor").value;
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = "autofill-snippets.txt";
  a.click();
  URL.revokeObjectURL(url);
});

// ══════════════════════════════════════════════════════════════════════════════
// Réinitialisation snippets
// ══════════════════════════════════════════════════════════════════════════════
document.getElementById("btn-reset-snippets")?.addEventListener("click", () => {
  if (!confirm("Réinitialiser les snippets avec les valeurs par défaut ?")) return;
  const editor = document.getElementById("snippets-editor");
  if (editor) { editor.value = DEFAULT_SNIPPETS_TEXT; updateCount(DEFAULT_SNIPPETS_TEXT); }
});

// ══════════════════════════════════════════════════════════════════════════════
// Enregistrement Profil Perso
// ══════════════════════════════════════════════════════════════════════════════
document.getElementById("save-perso")?.addEventListener("click", () => {
  const FIELDS = ["prenom","nom","civilite","date_naissance","email","telephone","mobile",
                  "adresse","adresse2","code_postal","ville","pays","region"];
  const data = {};
  FIELDS.forEach(k => {
    const el = document.getElementById(`p_${k}`);
    if (el) data[k] = el.value;
  });
  chrome.storage.local.get("customProfiles", (result) => {
    const cp = result.customProfiles || {};
    cp.perso = data;
    chrome.storage.local.set({ customProfiles: cp }, () => flash("saved-perso"));
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// Enregistrement Profil Pro
// ══════════════════════════════════════════════════════════════════════════════
document.getElementById("save-pro")?.addEventListener("click", () => {
  const FIELDS = ["prenom","nom","email","telephone","organisation","entreprise",
                  "poste","service","statut","siret","adresse","code_postal","ville","pays"];
  const data = {};
  FIELDS.forEach(k => {
    const el = document.getElementById(`pro_${k}`);
    if (el) data[k] = el.value;
  });
  chrome.storage.local.get("customProfiles", (result) => {
    const cp = result.customProfiles || {};
    cp.pro = data;
    chrome.storage.local.set({ customProfiles: cp }, () => flash("saved-pro"));
  });
});
