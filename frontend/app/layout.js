import "./globals.css";

export const metadata = {
  title: "Orbit | Collaborative workspace",
  description: "Projects, tasks and teams moving in sync.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
