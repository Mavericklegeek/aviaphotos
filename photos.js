/* ============================================================
   Aviaphotos — lecture du dossier photos/ sur GitHub
   ============================================================ */
const utilisateur = "Mavericklegeek";
const depot       = "aviaphotos";
const dossier     = "photos";
const branche     = "main";

// URL de ton Worker Cloudflare pour des likes cumulés entre visiteurs.
// Laisse "" pour utiliser simplement le fichier likes.json.
const apiLikes = "";

const API = `https://api.github.com/repos/${utilisateur}/${depot}`;
const EXT = /\.(jpe?g|png|gif|webp|avif)$/i;

let PHOTOS = [], courant = 0, mesLikes = {}, totaux = {};

try { mesLikes = JSON.parse(localStorage.getItem("mesLikes") || "{}"); } catch (e) {}
const sauver = () => { try { localStorage.setItem("mesLikes", JSON.stringify(mesLikes)); } catch (e) {} };

const jour = iso => iso
  ? new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })
  : "";
const jourHeure = iso => iso
  ? new Date(iso).toLocaleString("fr-FR", { day: "numeric", month: "long", year: "numeric",
                                            hour: "2-digit", minute: "2-digit" })
  : "";

/* ---------- 1. Liste des photos (même principe que ton script) ---------- */
async function chargerPhotos() {
  const r = await fetch(`${API}/contents/${dossier}?ref=${branche}`);
  if (!r.ok) throw new Error("API GitHub : " + r.status);

  const fichiers = (await r.json()).filter(f => f.type === "file" && EXT.test(f.name));

  // Date d'ajout : un appel /commits par photo, mis en cache localement
  let cache = {};
  try { cache = JSON.parse(localStorage.getItem("datesPhotos") || "{}"); } catch (e) {}

  const photos = await Promise.all(fichiers.map(async f => {
    if (!cache[f.name]) {
      try {
        const c = await fetch(`${API}/commits?path=${dossier}/${encodeURIComponent(f.name)}&per_page=1`);
        if (c.ok) {
          const j = await c.json();
          const d = j[j.length - 1]?.commit?.author?.date;
          if (d) cache[f.name] = d;
        }
      } catch (e) {}
    }
    return { nom: f.name, url: f.download_url, date: cache[f.name] || null };
  }));

  try { localStorage.setItem("datesPhotos", JSON.stringify(cache)); } catch (e) {}
  return photos.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
}

/* ---------- 2. Compteurs de likes ---------- */
async function chargerTotaux() {
  // a) Worker Cloudflare si configuré (likes réellement cumulés)
  if (apiLikes) {
    try {
      const r = await fetch(apiLikes + "/likes");
      if (r.ok) { totaux = await r.json(); return; }
    } catch (e) {}
  }
  // b) sinon likes.json du dépôt  →  { "photo1.jpg": 12, "photo2.jpg": 3 }
  try {
    const r = await fetch("likes.json", { cache: "no-cache" });
    if (r.ok) totaux = await r.json();
  } catch (e) {}
}

async function envoyerLike(nom, delta) {
  if (!apiLikes) return;                       // likes.json est en lecture seule
  try {
    const r = await fetch(apiLikes + "/like", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: nom, delta })
    });
    if (r.ok) {
      const j = await r.json();
      if (typeof j.count === "number") totaux[nom] = j.count;
    }
  } catch (e) {}
}

// Total affiché : base + le like du visiteur (qui n'est pas encore dans le fichier)
const nbLikes = nom => (totaux[nom] || 0) + (!apiLikes && mesLikes[nom] ? 1 : 0);

/* ---------- 3. Grille ---------- */
const galerie = document.getElementById("galerie");

function dessiner() {
  galerie.innerHTML = "";
  if (!PHOTOS.length) {
    galerie.innerHTML = `<p class="message">Aucune photo dans <b>${dossier}/</b> pour le moment.</p>`;
    return;
  }
  PHOTOS.forEach((p, i) => {
    const b = document.createElement("button");
    b.className = "vignette";
    b.dataset.i = i;
    b.innerHTML = `<img src="${p.url}" alt="${p.nom}" loading="lazy">
      <span class="infos">
        <span>${jour(p.date)}</span>
        <span class="c" data-c="${i}">${nbLikes(p.nom) ? "♥ " + nbLikes(p.nom) : ""}</span>
      </span>`;
    b.addEventListener("click", () => ouvrir(i));
    galerie.appendChild(b);
  });
}

function majVignette(i) {
  const el = galerie.querySelector(`[data-c="${i}"]`);
  const n = nbLikes(PHOTOS[i].nom);
  if (el) el.textContent = n ? "♥ " + n : "";
}

/* ---------- 4. Lightbox ---------- */
const lightbox = document.getElementById("lightbox"),
      grande   = document.getElementById("grandePhoto"),
      legende  = document.getElementById("legende"),
      btnLike  = document.getElementById("btnLike"),
      coeur    = document.getElementById("coeur"),
      txtLike  = document.getElementById("texteLike"),
      cpt      = document.getElementById("compteur"),
      lienDl   = document.getElementById("btnTelecharger");

function ouvrir(i) {
  courant = i;
  const p = PHOTOS[i];
  grande.src = p.url;
  grande.alt = p.nom;
  legende.innerHTML = p.nom + (p.date ? "<br>Publiée le " + jourHeure(p.date) : "");
  lienDl.href = p.url;
  lienDl.download = p.nom;
  majLike();
  lightbox.classList.add("ouvert");
  document.body.style.overflow = "hidden";
  document.getElementById("btnFermer").focus();
}

function fermer() {
  lightbox.classList.remove("ouvert");
  document.body.style.overflow = "";
  galerie.querySelector(`[data-i="${courant}"]`)?.focus();
}

const deplacer = pas => ouvrir((courant + pas + PHOTOS.length) % PHOTOS.length);

function majLike() {
  const nom = PHOTOS[courant].nom, aime = !!mesLikes[nom], n = nbLikes(nom);
  btnLike.classList.toggle("actif", aime);
  coeur.textContent = aime ? "♥" : "♡";
  txtLike.textContent = aime ? "Aimé" : "J'aime";
  cpt.textContent = n === 0 ? "Aucun like" : n === 1 ? "1 like" : n + " likes";
}

btnLike.addEventListener("click", async () => {
  const nom = PHOTOS[courant].nom;
  const delta = mesLikes[nom] ? -1 : 1;
  if (delta === 1) mesLikes[nom] = true; else delete mesLikes[nom];
  sauver();
  if (apiLikes) totaux[nom] = Math.max(0, (totaux[nom] || 0) + delta);
  majLike(); majVignette(courant);
  await envoyerLike(nom, delta);
  majLike(); majVignette(courant);
});

document.getElementById("btnFermer").addEventListener("click", fermer);
document.getElementById("btnPrec").addEventListener("click", () => deplacer(-1));
document.getElementById("btnSuiv").addEventListener("click", () => deplacer(1));
lightbox.addEventListener("click", e => { if (e.target === lightbox) fermer(); });
document.addEventListener("keydown", e => {
  if (!lightbox.classList.contains("ouvert")) return;
  if (e.key === "Escape") fermer();
  if (e.key === "ArrowLeft") deplacer(-1);
  if (e.key === "ArrowRight") deplacer(1);
});

/* ---------- 5. Démarrage ---------- */
(async () => {
  const st = document.getElementById("sousTitre");
  try {
    const [photos] = await Promise.all([chargerPhotos(), chargerTotaux()]);
    PHOTOS = photos;
    dessiner();
    st.textContent = PHOTOS.length
      ? `${PHOTOS.length} photo${PHOTOS.length > 1 ? "s" : ""} — cliquez pour agrandir`
      : "";
  } catch (erreur) {
    console.error("Erreur :", erreur);
    st.textContent = "";
    galerie.innerHTML = `<p class="message">Impossible de charger les photos.<br>
      <small>${erreur.message}</small></p>`;
  }
})();
