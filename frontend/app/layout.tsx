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
      <body className="flex flex-col min-h-screen bg-gray-100 text-gray-900">
        {/* Header (moved from left sidebar) */}
        <header className="w-full bg-gray-900 text-white flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            <h1 className="text-xl font-bold">OpenFruit Dashboard</h1>
          </div>

          <nav className="flex items-center gap-3">
            <Link href="/" className="hover:bg-gray-800 p-2 rounded flex items-center space-x-2">
              <Icon icon="mdi:home" width="20" height="20" className="text-blue-400" />
              <span>Home</span>
            </Link>
            <Link href="/dashboard" className="hover:bg-gray-800 p-2 rounded flex items-center space-x-2">
              <Icon icon="mdi:sword" width="20" height="20" className="text-blue-400" />
              <span>Dashboard</span>
            </Link>
            <Link href="/detection" className="hover:bg-gray-800 p-2 rounded flex items-center space-x-2">
              <Icon icon="mdi:shield" width="20" height="20" className="text-blue-400" />
              <span>Detection</span>
            </Link>
            <Link href="/integation" className="hover:bg-gray-800 p-2 rounded flex items-center space-x-2">
              <Icon icon="mdi:contract" width="20" height="20" className="text-blue-400" />
              <span>Integation</span>
            </Link>
          </nav>
        </header>

        {/* Main content */}
        <main className="flex-1 p-2">{children}</main>
      </body>
    </html>
  );
}
