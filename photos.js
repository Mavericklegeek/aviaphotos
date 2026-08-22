const utilisateur = "Mavericklegeek";
const depot = "aviaphotos";
const dossier = "photos";

fetch(`https://api.github.com/repos/${utilisateur}/${depot}/contents/${dossier}`)
    .then(response => response.json())
    .then(fichiers => {
        const galerie = document.getElementById("galerie");

        fichiers.forEach(fichier => {
            if (
                fichier.type === "file" &&
                /\.(jpg|jpeg|png|gif|webp)$/i.test(fichier.name)
            ) {
                const img = document.createElement("img");

                img.src = fichier.download_url;
                img.alt = fichier.name;

                galerie.appendChild(img);
            }
        });
    })
    .catch(erreur => console.error("Erreur :", erreur));