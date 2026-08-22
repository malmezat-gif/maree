"use client";

import { useEffect } from "react";

/**
 * Dernier filet. Sans ce fichier, toute exception échappée du rendu remonte à
 * l'écran d'erreur générique de Next : fond blanc, texte anglais, aucun horaire,
 * aucune indication de ce qu'il faut faire.
 *
 * Cette page ne prétend pas connaître la marée — c'est justement ce qui a
 * échoué. Elle dit ce qui s'est passé, propose de réessayer, et rappelle où
 * trouver les horaires officiels, parce que quelqu'un qui ouvre cette
 * application est peut-être sur le point d'entrer dans l'eau.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Marée — rendu interrompu :", error);
  }, [error]);

  return (
    <main className="app-error">
      <div className="app-error-card">
        <p className="app-error-eyebrow">Marée</p>
        <h1>Les horaires n’ont pas pu s’afficher</h1>
        <p>
          Le calcul de la marée s’est interrompu. Vos données ne sont pas en
          cause&nbsp;: tout est calculé sur cet appareil, rien n’a été envoyé.
        </p>
        <div className="app-error-actions">
          <button type="button" onClick={reset}>
            Réessayer
          </button>
          <a href="https://maree.shom.fr" rel="noreferrer noopener" target="_blank">
            Horaires officiels SHOM
          </a>
        </div>
        <p className="app-error-note">
          Si l’écran reste vide, fermez puis rouvrez l’application. En attendant,
          ne vous fiez qu’aux horaires officiels.
        </p>
      </div>
    </main>
  );
}
