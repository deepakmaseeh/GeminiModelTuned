import "./globals.css";

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="antialiased">
      <body className="min-h-screen font-sans text-slate-800">
        {children}
      </body>
    </html>
  );
}
