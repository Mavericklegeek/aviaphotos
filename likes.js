/* ============================================================
   likes.js — compteurs de likes partagés entre tous les visiteurs
   ============================================================
   Fonctionne avec le Worker Cloudflare (likes-worker.js).
   Tant que apiLikes reste vide, les likes ne sont visibles
   que dans le navigateur de chaque visiteur (aucun partage réel).
   ============================================================ */

// Colle ici l'URL de ton Worker une fois déployé, ex :
// const apiLikes = "https://aviaphotos-likes.ton-pseudo.workers.dev";
const apiLikes = "";

let totaux = {};       // { "photo1.jpg": 12, "photo2.jpg": 3, ... }
let mesLikes = {};     // likes du visiteur courant, mémorisés localement

try { mesLikes = JSON.parse(localStorage.getItem("mesLikes") || "{}"); } catch (e) {}
const sauverMesLikes = () => {
  try { localStorage.setItem("mesLikes", JSON.stringify(mesLikes)); } catch (e) {}
};

/* Récupère tous les compteurs au chargement de la page */
async function chargerTotaux() {
  if (!apiLikes) return;   // pas de Worker configuré : rien à charger
  try {
    const r = await fetch(apiLikes + "/likes");
    if (r.ok) totaux = await r.json();
  } catch (erreur) {
    console.error("Impossible de charger les likes :", erreur);
  }
}

/* Envoie +1 ou -1 au Worker pour une photo donnée */
async function envoyerLike(nom, delta) {
  if (!apiLikes) return;
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
  } catch (erreur) {
    console.error("Impossible d'enregistrer le like :", erreur);
  }
}

/* Bascule le like du visiteur pour une photo (appelé au clic sur le cœur) */
async function basculerLike(nom) {
  const deja = !!mesLikes[nom];
  const delta = deja ? -1 : 1;

  if (deja) delete mesLikes[nom]; else mesLikes[nom] = true;
  sauverMesLikes();

  // mise à jour optimiste (affichage immédiat, avant la réponse du serveur)
  totaux[nom] = Math.max(0, (totaux[nom] || 0) + delta);

  await envoyerLike(nom, delta);
  return { aime: !deja, total: nbLikes(nom) };
}

/* Nombre de likes à afficher pour une photo */
function nbLikes(nom) {
  if (apiLikes) return totaux[nom] || 0;
  // Sans Worker : on ne connaît que le like local du visiteur
  return mesLikes[nom] ? 1 : 0;
}

function aAime(nom) {
  return !!mesLikes[nom];
}

/* ------------------------------------------------------------
   Pour toi (propriétaire du site) : voir tous les totaux
   d'un coup dans la console du navigateur.
   Ouvre le site, F12 > Console, tape : voirLikes()
   ------------------------------------------------------------ */
function voirLikes() {
  if (!apiLikes) {
    console.warn("Aucun Worker configuré : ces chiffres ne sont pas partagés entre visiteurs.");
  }
  console.table(totaux);
  return totaux;
}
