import "./globals.css";

export const metadata = {
  title: "Japanese Study",
  description: "A small Japanese study app",
  manifest: "/manifest.webmanifest"
};

export const viewport = {
  themeColor: "#145c58"
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
