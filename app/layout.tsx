import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "PARISA AI",
  description: "আপনার ব্যক্তিগত AI সহকারী",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "PARISA AI",
  },
};

export const viewport: Viewport = {
  themeColor: "#001f3f",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="bn">
      <head>
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body>{children}</body>
    </html>
  );
}
