// content.js – Détection et remplissage des champs de formulaire
// Ce script est injecté dynamiquement dans la page cible.

(function () {
  "use strict";

  // ── Mapping : clés de profil → patterns de détection ──────────────────────
  const FIELD_PATTERNS = {
    prenom: [
      /pr[eé]nom/i, /first.?name/i, /given.?name/i, /forename/i
    ],
    nom: [
      /\bnom\b/i, /last.?name/i, /surname/i, /family.?name/i
    ],
    nom_complet: [
      /nom.?complet/i, /full.?name/i, /votre.?nom/i, /your.?name/i,
      /^name$/i
    ],
    civilite: [
      /civilit[eé]/i, /titre/i, /title/i, /salutation/i, /gender.?title/i
    ],
    date_naissance: [
      /naissance/i, /birth.?date/i, /date.?of.?birth/i, /dob/i, /birthday/i
    ],
    email: [
      /e.?mail/i, /courriel/i
    ],
    telephone: [
      /t[eé]l[eé]phone/i, /phone/i, /\btel\b/i, /\bfax\b/i
    ],
    mobile: [
      /mobile/i, /portable/i, /cell/i
    ],
    adresse: [
      /^adresse$/i, /^address$/i, /adresse.?1/i, /address.?1/i,
      /rue/i, /street/i, /voie/i
    ],
    adresse2: [
      /adresse.?2/i, /address.?2/i, /complement/i, /apt/i, /suite/i
    ],
    ville: [
      /\bville\b/i, /\bcity\b/i, /\btown\b/i, /commune/i, /municipality/i
    ],
    code_postal: [
      /code.?postal/i, /\bcp\b/i, /zip/i, /postal.?code/i, /post.?code/i
    ],
    pays: [
      /\bpays\b/i, /\bcountry\b/i, /nation/i
    ],
    region: [
      /r[eé]gion/i, /province/i, /state/i
    ],
    departement: [
      /d[eé]partement/i, /county/i, /district/i
    ],
    organisation: [
      /organisation/i, /organisme/i, /\bstructure\b/i, /\bassociation\b/i
    ],
    entreprise: [
      /entreprise/i, /\bsoci[eé]t[eé]\b/i, /company/i, /\bfirm\b/i,
      /\bcorp\b/i, /\bemployer\b/i
    ],
    service: [
      /\bservice\b/i, /\bdivision\b/i, /\bdepartment\b/i, /\bdept\b/i
    ],
    poste: [
      /\bposte\b/i, /\bposition\b/i, /\btitle\b/i, /\bjob\b/i,
      /fonction/i, /\brole\b/i
    ],
    siret: [
      /siret/i, /siren/i, /\btva\b/i, /vat/i
    ],
    employeur: [
      /employeur/i, /employer/i
    ]
  };

  // ── Récupère la clé de profil correspondant à un champ ────────────────────
  function detectFieldKey(el) {
    const attrs = [
      el.name, el.id,
      el.getAttribute("placeholder"),
      el.getAttribute("autocomplete"),
      el.getAttribute("aria-label"),
      el.getAttribute("data-field")
    ].filter(Boolean).join(" ");

    // Cherche le label associé
    let labelText = "";
    if (el.id) {
      const lbl = document.querySelector(`label[for="${el.id}"]`);
      if (lbl) labelText = lbl.innerText || lbl.textContent || "";
    }
    const candidate = (attrs + " " + labelText).toLowerCase();

    for (const [key, patterns] of Object.entries(FIELD_PATTERNS)) {
      for (const pattern of patterns) {
        if (pattern.test(candidate)) return key;
      }
    }
    return null;
  }

  // ── Remplit un champ (input, select, textarea) ───────────────────────────
  function fillField(el, value) {
    if (!value) return false;

    const tag = el.tagName.toLowerCase();

    if (tag === "select") {
      // Cherche l'option correspondante
      for (const opt of el.options) {
        const optText = (opt.text + " " + opt.value).toLowerCase();
        if (optText.includes(value.toLowerCase())) {
          el.value = opt.value;
          triggerEvents(el);
          return true;
        }
      }
      return false;
    }

    if (tag === "input" || tag === "textarea") {
      const type = (el.type || "text").toLowerCase();
      if (["submit", "button", "reset", "image", "file", "hidden", "radio", "checkbox"].includes(type)) {
        return false;
      }
      el.value = value;
      triggerEvents(el);
      return true;
    }

    // Champ contenteditable
    if (el.isContentEditable) {
      el.innerText = value;
      triggerEvents(el);
      return true;
    }

    return false;
  }

  // ── Déclenche les événements nécessaires aux frameworks JS ────────────────
  function triggerEvents(el) {
    ["input", "change", "blur", "keyup"].forEach(evtName => {
      el.dispatchEvent(new Event(evtName, { bubbles: true }));
    });
  }

  // ── Fonction principale de remplissage ────────────────────────────────────
  function fillForm(profileData) {
    const fields = document.querySelectorAll(
      'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]):not([type="file"]), ' +
      'select, textarea, [contenteditable="true"]'
    );

    let filled = 0;
    let skipped = 0;

    fields.forEach(el => {
      // Ne pas écraser un champ déjà rempli (sauf si vide)
      const currentVal = el.value || el.innerText || "";
      if (currentVal.trim() !== "") {
        skipped++;
        return;
      }

      const key = detectFieldKey(el);
      if (!key) return;

      const value = profileData[key];
      if (!value) return;

      if (fillField(el, value)) {
        filled++;
        // Indicateur visuel temporaire
        const origBg = el.style.backgroundColor;
        el.style.backgroundColor = "#d4edda";
        setTimeout(() => { el.style.backgroundColor = origBg; }, 1500);
      }
    });

    // Toast de confirmation
    showToast(filled, skipped);
  }

  // ── Toast de notification ─────────────────────────────────────────────────
  function showToast(filled, skipped) {
    // Supprimer un éventuel toast existant
    const existing = document.getElementById("autofill-toast");
    if (existing) existing.remove();

    const toast = document.createElement("div");
    toast.id = "autofill-toast";
    toast.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 2147483647;
      background: #1a1a2e;
      color: #fff;
      padding: 14px 20px;
      border-radius: 10px;
      font-family: system-ui, sans-serif;
      font-size: 14px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.4);
      display: flex;
      align-items: center;
      gap: 10px;
      max-width: 320px;
      border-left: 4px solid #4ade80;
      animation: autofill-slidein 0.3s ease;
    `;

    toast.innerHTML = `
      <style>
        @keyframes autofill-slidein {
          from { transform: translateX(120%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      </style>
      <span style="font-size:20px">✅</span>
      <div>
        <div style="font-weight:600">AutoFill terminé</div>
        <div style="color:#aaa;font-size:12px;margin-top:2px">
          ${filled} champ${filled > 1 ? "s" : ""} rempli${filled > 1 ? "s" : ""}
          ${skipped > 0 ? ` · ${skipped} ignoré${skipped > 1 ? "s" : ""} (déjà rempli${skipped > 1 ? "s" : ""})` : ""}
        </div>
      </div>
    `;

    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.transition = "opacity 0.4s";
      toast.style.opacity = "0";
      setTimeout(() => toast.remove(), 400);
    }, 3500);
  }

  // ── Insertion d'un snippet dans le champ actif (focalisé) ───────────────
  function insertSnippet(value) {
    // Cherche le dernier champ qui avait le focus
    const el = document.activeElement;

    if (!el) {
      showSnippetToast(false, "Aucun champ sélectionné");
      return;
    }

    const tag  = el.tagName.toLowerCase();
    const type = (el.type || "text").toLowerCase();

    // Champs texte classiques
    if ((tag === "input" || tag === "textarea") &&
        !["submit","button","reset","file","image","checkbox","radio","hidden"].includes(type)) {

      const start = el.selectionStart ?? el.value.length;
      const end   = el.selectionEnd   ?? el.value.length;

      // Insère au curseur (ou remplace la sélection)
      el.value = el.value.substring(0, start) + value + el.value.substring(end);

      // Replace le curseur après l'insertion
      const newPos = start + value.length;
      el.setSelectionRange(newPos, newPos);
      triggerEvents(el);
      showSnippetToast(true, value);
      return;
    }

    // ContentEditable
    if (el.isContentEditable) {
      const sel = window.getSelection();
      if (sel && sel.rangeCount) {
        const range = sel.getRangeAt(0);
        range.deleteContents();
        range.insertNode(document.createTextNode(value));
        range.collapse(false);
      } else {
        el.innerText += value;
      }
      triggerEvents(el);
      showSnippetToast(true, value);
      return;
    }

    showSnippetToast(false, "Ce champ ne peut pas recevoir de texte");
  }

  // ── Toast snippet ─────────────────────────────────────────────────────────
  function showSnippetToast(success, text) {
    const existing = document.getElementById("autofill-toast");
    if (existing) existing.remove();

    const preview = text.length > 40 ? text.substring(0, 40) + "…" : text;
    const toast = document.createElement("div");
    toast.id = "autofill-toast";
    toast.style.cssText = `
      position:fixed;bottom:24px;right:24px;z-index:2147483647;
      background:#1a1a2e;color:#fff;padding:12px 18px;
      border-radius:10px;font-family:system-ui,sans-serif;font-size:13px;
      box-shadow:0 4px 20px rgba(0,0,0,.4);display:flex;align-items:center;
      gap:10px;max-width:340px;
      border-left:4px solid ${success ? "#4ade80" : "#f87171"};
    `;
    toast.innerHTML = `
      <span style="font-size:18px">${success ? "📋" : "⚠️"}</span>
      <div>
        <div style="font-weight:600">${success ? "Snippet inséré" : "Erreur"}</div>
        <div style="color:#aaa;font-size:11px;margin-top:2px">${preview}</div>
      </div>`;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.transition = "opacity .4s"; toast.style.opacity = "0";
      setTimeout(() => toast.remove(), 400);
    }, 2500);
  }

  // ── Écoute du message envoyé par background.js ────────────────────────────
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === "insertSnippet") {
      insertSnippet(message.value);
      return;
    }

    if (message.action !== "autofill") return;

    const profileId = message.profileId;

    // PROFILES est défini dans profiles.js, injecté avant content.js
    if (typeof PROFILES === "undefined") {
      console.error("AutoFill – PROFILES non défini !");
      return;
    }

    const profile = PROFILES[profileId];
    if (!profile) {
      console.error("AutoFill – Profil inconnu :", profileId);
      return;
    }

    fillForm(profile.data);
  });

})();
