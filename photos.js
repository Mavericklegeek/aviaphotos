/* ============================================================
   Aviaphotos — photos + vidéos depuis le dossier photos/ sur GitHub
   ============================================================ */

const utilisateur = "Mavericklegeek";
const depot       = "aviaphotos";
const dossier     = "photos";
const branche     = "main";

const API = `https://api.github.com/repos/${utilisateur}/${depot}`;
const EXT_IMAGE = /\.(jpe?g|png|gif|webp|avif)$/i;
const EXT_VIDEO = /\.(mp4|webm|ogg|mov)$/i;

let PHOTOS = [], courant = 0;

const jour = iso => iso
  ? new Date(iso).toLocaleDateString("fr-FR", {
      day: "numeric", month: "short", year: "numeric"
    })
  : "";

const jourHeure = iso => iso
  ? new Date(iso).toLocaleString("fr-FR", {
      day: "numeric", month: "long", year: "numeric",
      hour: "2-digit", minute: "2-digit"
    })
  : "";

/* ---------- 1. Liste des photos et vidéos ---------- */
async function chargerPhotos() {
  const r = await fetch(`${API}/contents/${dossier}?ref=${branche}`);
  if (!r.ok) throw new Error("API GitHub : " + r.status);

  const fichiers = (await r.json()).filter(
    f => f.type === "file" && (EXT_IMAGE.test(f.name) || EXT_VIDEO.test(f.name))
  );

  let cache = {};
  try {
    cache = JSON.parse(localStorage.getItem("datesPhotos") || "{}");
  } catch (e) {}

  const photos = await Promise.all(fichiers.map(async f => {
    if (!cache[f.name]) {
      try {
        const c = await fetch(
          `${API}/commits?path=${dossier}/${encodeURIComponent(f.name)}&per_page=1`
        );
        if (c.ok) {
          const j = await c.json();
          const d = j[j.length - 1]?.commit?.author?.date;
          if (d) cache[f.name] = d;
        }
      } catch (e) {}
    }

    return {
      nom: f.name,
      url: f.download_url,
      date: cache[f.name] || null,
      type: EXT_VIDEO.test(f.name) ? "video" : "image"
    };
  }));

  try {
    localStorage.setItem("datesPhotos", JSON.stringify(cache));
  } catch (e) {}

  return photos.sort(
    (a, b) => new Date(b.date || 0) - new Date(a.date || 0)
  );
}

/* ---------- 2. Grille ---------- */
const galerie = document.getElementById("galerie");

function dessiner() {
  galerie.innerHTML = "";

  if (!PHOTOS.length) {
    galerie.innerHTML =
      `<p class="message">Aucune photo ou vidéo dans <b>${dossier}/</b> pour le moment.</p>`;
    return;
  }

  PHOTOS.forEach((p, i) => {
    const b = document.createElement("button");
    b.className = "vignette";
    b.dataset.i = i;

    if (p.type === "video") {
      b.innerHTML = `
        <div class="miniature-video">
          <span class="icone-video">▶</span>
          <span class="etiquette-video">VIDÉO</span>
        </div>
        <span class="infos">
          <span>${jour(p.date)}</span>
          <span>${p.nom}</span>
        </span>`;
    } else {
      b.innerHTML = `
        <img src="${p.url}" alt="${p.nom}" loading="lazy">
        <span class="infos">
          <span>${jour(p.date)}</span>
          <span>${p.nom}</span>
        </span>`;
    }

    b.addEventListener("click", () => ouvrir(i));
    galerie.appendChild(b);
  });
}

/* ---------- 3. Fenêtre agrandie ---------- */
const lightbox = document.getElementById("lightbox");
const grande   = document.getElementById("grandePhoto");
const grandeVideo = document.getElementById("grandeVideo");
const legende  = document.getElementById("legende");
const lienDl   = document.getElementById("btnTelecharger");

function ouvrir(i) {
  courant = i;
  const p = PHOTOS[i];

  grande.style.display = "none";
  grandeVideo.style.display = "none";
  grandeVideo.pause();
  grandeVideo.removeAttribute("src");
  grandeVideo.load();

  if (p.type === "video") {
    grandeVideo.src = p.url;
    grandeVideo.style.display = "block";
    // PAS d'autoplay : la vidéo démarre uniquement quand le visiteur
    // appuie sur le bouton lecture du lecteur.
  } else {
    grande.src = p.url;
    grande.alt = p.nom;
    grande.style.display = "block";
  }

  legende.innerHTML =
    p.nom + (p.date ? "<br>Publiée le " + jourHeure(p.date) : "");

  lienDl.href = p.url;
  lienDl.download = p.nom;

  lightbox.classList.add("ouvert");
  document.body.style.overflow = "hidden";
  document.getElementById("btnFermer").focus();
}

function fermer() {
  grandeVideo.pause();
  grandeVideo.removeAttribute("src");
  grandeVideo.load();

  lightbox.classList.remove("ouvert");
  document.body.style.overflow = "";
  galerie.querySelector(`[data-i="${courant}"]`)?.focus();
}

const deplacer = pas => ouvrir(
  (courant + pas + PHOTOS.length) % PHOTOS.length
);

/* ---------- 4. Téléchargement ---------- */
lienDl.addEventListener("click", async e => {
  e.preventDefault();

  const p = PHOTOS[courant];
  const ancienTexte = lienDl.textContent;

  try {
    lienDl.textContent = "⤓ Téléchargement…";

    const reponse = await fetch(p.url);
    if (!reponse.ok) throw new Error("HTTP " + reponse.status);

    const blob = await reponse.blob();
    const urlBlob = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = urlBlob;
    a.download = p.nom;
    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(urlBlob);
  } catch (erreur) {
    console.error("Téléchargement impossible :", erreur);
    window.open(p.url, "_blank");
  } finally {
    lienDl.textContent = ancienTexte;
  }
});

/* ---------- 5. Navigation ---------- */
document.getElementById("btnFermer").addEventListener("click", fermer);
document.getElementById("btnPrec").addEventListener("click", () => deplacer(-1));
document.getElementById("btnSuiv").addEventListener("click", () => deplacer(1));

lightbox.addEventListener("click", e => {
  if (e.target === lightbox) fermer();
});

document.addEventListener("keydown", e => {
  if (!lightbox.classList.contains("ouvert")) return;

  if (e.key === "Escape") fermer();
  if (e.key === "ArrowLeft") deplacer(-1);
  if (e.key === "ArrowRight") deplacer(1);
});

/* ---------- 6. Démarrage ---------- */
(async () => {
  const st = document.getElementById("sousTitre");

  try {
    PHOTOS = await chargerPhotos();
    dessiner();

    st.textContent = PHOTOS.length
      ? `${PHOTOS.length} élément${PHOTOS.length > 1 ? "s" : ""} — cliquez pour ouvrir`
      : "";
  } catch (erreur) {
    console.error("Erreur :", erreur);
    st.textContent = "";
    galerie.innerHTML = `
      <p class="message">
        Impossible de charger les photos et vidéos.<br>
        <small>${erreur.message}</small>
      </p>`;
  }
})();
