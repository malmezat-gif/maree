import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./globals.css";
import { PwaRegistration } from "./pwa-registration";
import { ViewportFit } from "./viewport-fit";

const title = "Marée — La mer au fil du temps";
const description =
  "Consultez les horaires et coefficients de marée, puis explorez la hauteur de l’eau au fil de la journée.";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;
  const socialImage = new URL("/og.png", origin).toString();

  return {
    metadataBase: new URL(origin),
    title,
    description,
    applicationName: "Marée",
    manifest: "/manifest.webmanifest",
    icons: {
      icon: [
        { url: "/icons/maree-192.png", sizes: "192x192", type: "image/png" },
        { url: "/icons/maree-512.png", sizes: "512x512", type: "image/png" },
      ],
      apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    },
    appleWebApp: {
      capable: true,
      title: "Marée",
      statusBarStyle: "black-translucent",
    },
    formatDetection: { telephone: false },
    openGraph: {
      type: "website",
      locale: "fr_FR",
      siteName: "Marée",
      title,
      description,
      url: origin,
      images: [{ url: socialImage, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [socialImage],
    },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#075f90",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <head>
        {/* Le décor de la côte est très probablement l'élément LCP, et il n'est
            référencé que par un `background-image` dans la feuille de style :
            le préchargeur du navigateur ne peut pas le découvrir avant d'avoir
            téléchargé et analysé tout le CSS. Ce lien lui fait gagner cet
            aller-retour.

            Le fond marin n'est délibérément pas préchargé : il ne devient
            visible qu'après un glissement vers les prévisions, et l'y ajouter
            reviendrait à imposer ses 82 Ko à toutes les sessions. */}
        <link
          rel="preload"
          as="image"
          type="image/webp"
          href="/assets/coast/coast-v3.webp"
        />
      </head>
      <body>
        {children}
        <ViewportFit />
        <PwaRegistration />
      </body>
    </html>
  );
}
