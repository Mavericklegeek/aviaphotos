const MOT_DE_PASSE = "06062013";

const connexion = document.getElementById("connexion");
const panelAdmin = document.getElementById("panelAdmin");

const motDePasse = document.getElementById("motDePasse");
const boutonConnexion = document.getElementById("boutonConnexion");
const erreur = document.getElementById("erreur");

const photo = document.getElementById("photo");
const boutonAjouter = document.getElementById("boutonAjouter");

const listePhotos = document.getElementById("listePhotos");
const message = document.getElementById("message");


// CONNEXION
boutonConnexion.addEventListener("click", function () {

    if (motDePasse.value === MOT_DE_PASSE) {

        connexion.style.display = "none";
        panelAdmin.style.display = "block";

        afficherPhotos();

    } else {

        erreur.textContent = "Mot de passe incorrect.";

    }

});


// AJOUTER UNE PHOTO
boutonAjouter.addEventListener("click", async function () {

    const fichier = photo.files[0];

    if (!fichier) {
        message.textContent = "Choisis une photo.";
        return;
    }


    // Vérification du type
    if (!fichier.type.startsWith("image/")) {

        message.textContent = "Le fichier doit être une image.";
        return;

    }


    message.textContent = "Envoi de la photo...";


    // Nom unique pour éviter les conflits
    const nomFichier =
        Date.now() + "-" + fichier.name;


    const { data, error } = await supabaseClient
        .storage
        .from("photos")
        .upload(nomFichier, fichier, {
            contentType: fichier.type,
            upsert: false
        });


    if (error) {

        console.error(error);

        message.textContent =
            "Erreur lors de l'envoi : " + error.message;

        return;

    }


    message.textContent = "Photo ajoutée ! 📸";

    photo.value = "";

    afficherPhotos();

});


// AFFICHER LES PHOTOS
async function afficherPhotos() {

    listePhotos.innerHTML = "";

    const { data, error } = await supabaseClient
        .storage
        .from("photos")
        .list();


    if (error) {

        console.error(error);

        listePhotos.innerHTML =
            "<li>Impossible de récupérer les photos.</li>";

        return;

    }


    data.forEach(function (fichier) {

        if (!fichier.name) {
            return;
        }


        const element = document.createElement("li");

        const image = document.createElement("img");

        const { data: urlData } =
            supabaseClient
                .storage
                .from("photos")
                .getPublicUrl(fichier.name);


        image.src = urlData.publicUrl;
        image.width = 200;


        const boutonSupprimer =
            document.createElement("button");

        boutonSupprimer.textContent = "Supprimer";


        boutonSupprimer.addEventListener(
            "click",
            function () {

                supprimerPhoto(fichier.name);

            }
        );


        element.appendChild(image);

        element.appendChild(
            document.createTextNode(" ")
        );

        element.appendChild(boutonSupprimer);

        listePhotos.appendChild(element);

    });

}


// SUPPRIMER UNE PHOTO
async function supprimerPhoto(nomFichier) {

    const confirmation =
        confirm("Supprimer cette photo ?");


    if (!confirmation) {
        return;
    }


    const { error } = await supabaseClient
        .storage
        .from("photos")
        .remove([nomFichier]);


    if (error) {

        console.error(error);

        alert(
            "Impossible de supprimer la photo : "
            + error.message
        );

        return;

    }


    afficherPhotos();

}