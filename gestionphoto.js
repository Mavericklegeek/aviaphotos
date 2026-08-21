const formulaire = document.getElementById("formulairePhoto");
const champ = document.getElementById("uploadphoto");
const liste = document.getElementById("listePhotos");

formulaire.addEventListener("submit", function(event) {
    event.preventDefault();

    const fichier = champ.files[0];

    if (fichier) {
        const nouvelElement = document.createElement("li");

        const image = document.createElement("img");
        image.src = URL.createObjectURL(fichier);
        image.width = 150;

        nouvelElement.appendChild(image);
        liste.appendChild(nouvelElement);

        formulaire.reset();
    }
});