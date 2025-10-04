// PrimeVicio - Site - Copia/app/layout.tsx
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import "./globals.css"
import { FavoritesProvider } from "@/components/favorites-context"
import { LayoutWrapper } from "@/components/layout-wrapper"
import { AuthProvider } from "@/components/auth/auth-context" // Importamos o provedor

export const metadata: Metadata = {
  title: "PrimeVicio - Assista a Filmes e Séries Grátis",
  description: "Sua plataforma para assistir aos melhores filmes e séries online, totalmente gratuito e com qualidade.",
  icons: "https://i.ibb.co/xqg1wMh2/Chat-GPT-Image-14-de-ago-de-2025-23-47-40.png",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" className="dark">
      <head>
        <meta name="google-site-verification" content="q5GnYgfSLz8RBSXp5gg13u_GOBloxYaSi8gSLA3QhPs" />
        <script src="https://cdn.jsdelivr.net/npm/disable-devtool@latest"></script>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                DisableDevtool({
                  disableMenu: true,
                  disableSelect: false,
                  disableCopy: false,
                  disableCut: true,
                  disablePaste: false,
                  clearLog: true,
                  interval: 500,
                  ondevtoolopen: function(type, next) {
                    window.location.href = 'https://i.ibb.co/5hH6bbp2/tentando-inspecionar-o-site.png';
                  }
                });
              } catch(e) {
                console.warn('DisableDevtool failed to initialize');
              }
            `,
          }}
        />
        <style>{`
          html {
            font-family: ${GeistSans.style.fontFamily};
            --font-sans: ${GeistSans.variable};
            --font-mono: ${GeistMono.variable};
          }
        `}</style>
      </head>
      <body className="bg-zinc-950">
        <AuthProvider> {/* O AuthProvider envolve os outros componentes */}
          <FavoritesProvider>
            <LayoutWrapper>
              {children}
            </LayoutWrapper>
          </FavoritesProvider>
        </AuthProvider>
      </body>
    </html>
  )
}