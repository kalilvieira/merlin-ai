import "./globals.css";
export const metadata = {
  title: "Merlin AI | Encontre seu produto",
  description: "Assistente de produtos e navegação inteligente na loja.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/merlin-logo.png",
    shortcut: "/merlin-logo.png",
  },
};
export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">{children}</body>
    </html>
  );
}
