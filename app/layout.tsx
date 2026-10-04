import type { Metadata } from "next";
import "./globals.css";
import "./tokens.css";
import "./design-system.css";
import "./animations.css";
import { AnimationProvider } from "@/components/animations/AnimationProvider";
import { LeagueDataProvider } from "@/components/animations/LeagueDataProvider";
export const metadata: Metadata = {
  title: "Copro League — Plus qu’un jeu",
  description: "Matchs, joueurs et histoire de notre ligue de football à 5.",
  icons: { icon: "/favicon.svg" },
  other: { "copro-version": process.env.NEXT_PUBLIC_APP_VERSION ?? "local" },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        {["archivo", "big-shoulders-display", "jetbrains-mono"].map((font) => (
          <link
            key={font}
            rel="preload"
            href={"/fonts/" + font + "-latin.woff2"}
            as="font"
            type="font/woff2"
            crossOrigin="anonymous"
          />
        ))}
      </head>
      <body>
        <AnimationProvider>
          <LeagueDataProvider>{children}</LeagueDataProvider>
        </AnimationProvider>
      </body>
    </html>
  );
}
