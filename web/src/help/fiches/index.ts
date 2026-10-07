import type { HelpFiche } from "@/help/types"
import { fiche as creerUnContenu } from "@/help/fiches/creer-un-contenu"
import { fiche as ecrireAvecDesBlocs } from "@/help/fiches/ecrire-avec-des-blocs"
import { fiche as voirCommeDansLApp } from "@/help/fiches/voir-comme-dans-l-app"
import { fiche as reprendreLaMain } from "@/help/fiches/reprendre-la-main"
import { fiche as gererLesCategories } from "@/help/fiches/gerer-les-categories"
import { fiche as publierUnContenu } from "@/help/fiches/publier-un-contenu"
import { fiche as choisirLeNiveauDAcces } from "@/help/fiches/choisir-le-niveau-d-acces"
import { fiche as programmerUnePublication } from "@/help/fiches/programmer-une-publication"
import { fiche as revenirAUneVersion } from "@/help/fiches/revenir-a-une-version"
import { fiche as envoyerDesFichiers } from "@/help/fiches/envoyer-des-fichiers"
import { fiche as decrireOuRemplacerUnFichier } from "@/help/fiches/decrire-ou-remplacer-un-fichier"
import { fiche as fichiersNonUtilises } from "@/help/fiches/fichiers-non-utilises"
import { fiche as utiliserLesModelesDeBloc } from "@/help/fiches/utiliser-les-modeles-de-bloc"
import { fiche as utiliserLaCorbeille } from "@/help/fiches/utiliser-la-corbeille"
import { fiche as inviterUnMembre } from "@/help/fiches/inviter-un-membre"
import { fiche as changerLeNomDeLaMarque } from "@/help/fiches/changer-le-nom-de-la-marque"

// Les fiches de l'aide, rangées par thème : contenus, publication, médiathèque, modèles,
// corbeille, équipe.
export const helpFiches: HelpFiche[] = [
  creerUnContenu,
  ecrireAvecDesBlocs,
  voirCommeDansLApp,
  reprendreLaMain,
  gererLesCategories,
  publierUnContenu,
  choisirLeNiveauDAcces,
  programmerUnePublication,
  revenirAUneVersion,
  envoyerDesFichiers,
  decrireOuRemplacerUnFichier,
  fichiersNonUtilises,
  utiliserLesModelesDeBloc,
  utiliserLaCorbeille,
  inviterUnMembre,
  changerLeNomDeLaMarque,
]
