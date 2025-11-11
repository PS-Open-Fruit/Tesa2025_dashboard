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
      <body className="flex min-h-screen bg-gray-100 text-gray-900">
        {/* Sidebar */}
        <aside className="w-64 bg-gray-900 text-white flex flex-col p-4">
          <h1 className="text-xl font-bold mb-6">OpenFruit Dashboard</h1>
          <nav className="flex flex-col gap-3">
            <Link href="/" className="hover:bg-gray-800 p-2 rounded flex items-center space-x-2">
              <Icon icon="mdi:home" width="20" height="20" className="text-blue-400" />
              <span>Home</span>
            </Link>
            <Link href="/about" className="hover:bg-gray-800 p-2 rounded flex items-center space-x-2">
            <Icon icon="mdi:about" width="20" height="20" className="text-blue-400" />
            <span>About</span>
            </Link>
            <Link href="/contact" className="hover:bg-gray-800 p-2 rounded flex items-center space-x-2">
            <Icon icon="mdi:contract" width="20" height="20" className="text-blue-400" />
            <span>Contact</span>
            </Link>
            <Link href="/integation" className="hover:bg-gray-800 p-2 rounded flex items-center space-x-2">
            <Icon icon="mdi:contract" width="20" height="20" className="text-blue-400" />
            <span>Integation</span>
            </Link>
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 p-8">{children}</main>
      </body>
    </html>
  );
}
