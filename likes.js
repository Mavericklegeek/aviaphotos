/* ============================================================
   likes.js — compteurs de likes partagés entre tous les visiteurs
   ============================================================
   Utilise countapi.mileshilliard.com : service gratuit, public,
   SANS inscription ni pour toi ni pour tes visiteurs.

   ATTENTION — à savoir avant d'utiliser ce service :
   - Il est géré par un particulier, pas une entreprise. Il peut
     tomber en panne ou fermer sans préavis (comme countapi.xyz
     avant lui).
   - Les clés et valeurs sont PUBLIQUES : quiconque devine ou
     connaît le nom d'une clé peut la lire, voire la modifier.
     N'y mets donc jamais rien de sensible.
   - Pas de garantie de disponibilité.
   Si tu veux plus de fiabilité et de contrôle, la seule alternative
   solide reste un Worker Cloudflare (gratuit, mais nécessite un
   compte Cloudflare pour toi).
   ============================================================ */

const BASE = "https://countapi.mileshilliard.com/api/v1";
// Préfixe pour éviter que le nom de tes photos entre en collision
// avec les clés d'un autre site utilisant le même service public.
const PREFIXE = "aviaphotos-mavericklegeek-";

let totaux = {};       // { "photo1.jpg": 12, "photo2.jpg": 3, ... }
let mesLikes = {};     // likes du visiteur courant, mémorisés localement

try { mesLikes = JSON.parse(localStorage.getItem("mesLikes") || "{}"); } catch (e) {}
const sauverMesLikes = () => {
  try { localStorage.setItem("mesLikes", JSON.stringify(mesLikes)); } catch (e) {}
};

const cle = nom => PREFIXE + encodeURIComponent(nom);

/* Récupère la valeur actuelle d'une clé (0 si elle n'existe pas encore) */
async function lireCompteur(nom) {
  try {
    const r = await fetch(`${BASE}/get/${cle(nom)}`);
    if (r.ok) {
      const j = await r.json();
      return Number(j.value) || 0;
    }
  } catch (e) {}
  return 0;
}

/* Charge les compteurs de toutes les photos actuellement affichées.
   (le service ne fournit pas de liste par préfixe : on interroge
   chaque photo individuellement une fois la liste connue) */
async function chargerTotaux(nomsPhotos = []) {
  await Promise.all(nomsPhotos.map(async nom => {
    totaux[nom] = await lireCompteur(nom);
  }));
}

/* Bascule le like du visiteur pour une photo */
async function basculerLike(nom) {
  const deja = !!mesLikes[nom];

  if (deja) {
    delete mesLikes[nom];
    // "unlike" : on relit la valeur puis on la fixe à valeur-1
    try {
      const actuel = await lireCompteur(nom);
      const nouveau = Math.max(0, actuel - 1);
      const r = await fetch(`${BASE}/set/${cle(nom)}?value=${nouveau}`);
      if (r.ok) totaux[nom] = nouveau;
    } catch (e) {}
  } else {
    mesLikes[nom] = true;
    // "like" : incrément atomique
    try {
      const r = await fetch(`${BASE}/hit/${cle(nom)}`);
      if (r.ok) {
        const j = await r.json();
        totaux[nom] = Number(j.value) || (totaux[nom] || 0) + 1;
      }
    } catch (e) {
      totaux[nom] = (totaux[nom] || 0) + 1; // repli local si la requête échoue
    }
  }

  sauverMesLikes();
  return { aime: !deja, total: nbLikes(nom) };
}

function nbLikes(nom) {
  return totaux[nom] || 0;
}

function aAime(nom) {
  return !!mesLikes[nom];
}

/* Pour toi : voir tous les totaux connus dans la console (F12) */
function voirLikes() {
  console.table(totaux);
  return totaux;
}
