import Link from "next/link";
import "./globals.css";
import { Icon } from "@iconify/react";

export const metadata = {
  title: "Dashboard Example",
  description: "Sidebar Navigation Example",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="flex flex-col min-h-screen bg-gray-100 text-gray-900" suppressHydrationWarning>
        {/* Header (moved from left sidebar) */}
        <header className="w-full bg-gray-900 text-white flex items-center justify-between px-4 py-2">
          <div className="flex items-center space-x-3">
            <h1 className="text-lg font-bold">OpenFruit Dashboard</h1>
          </div>

          <nav className="flex items-center gap-2">
            <Link href="/history" className="hover:bg-gray-800 px-2 py-1 rounded flex items-center space-x-1">
              <Icon icon="mdi:history" width="18" height="18" className="text-blue-400" />
              <span className="text-sm">History</span>
            </Link>
            <Link href="/defense" className="hover:bg-gray-800 px-2 py-1 rounded flex items-center space-x-1">
              <Icon icon="mdi:shield" width="18" height="18" className="text-blue-400" />
              <span className="text-sm">Defense</span>
            </Link>
            <Link href="/offense" className="hover:bg-gray-800 px-2 py-1 rounded flex items-center space-x-1">
              <Icon icon="mdi:sword" width="18" height="18" className="text-red-400" />
              <span className="text-sm">Offense</span>
            </Link>
            <Link href="/detection" className="hover:bg-gray-800 px-2 py-1 rounded flex items-center space-x-1">
              <Icon icon="mdi:shield" width="18" height="18" className="text-blue-400" />
              <span className="text-sm">Detection</span>
            </Link>
            <Link href="/integation" className="hover:bg-gray-800 px-2 py-1 rounded flex items-center space-x-1">
              <Icon icon="mdi:contract" width="18" height="18" className="text-blue-400" />
              <span className="text-sm">Integation</span>
            </Link>
          </nav>
        </header>

        {/* Main content */}
        <main className="flex-1 p-1">{children}</main>
      </body>
    </html>
  );
}
