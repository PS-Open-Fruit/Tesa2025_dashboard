import "./globals.css";
import Header from "@/components/Header";

export const metadata = {
  title: "OpenFruit Dashboard | TESA 2025",
  description: "Real-time Defense & Offense Monitoring Dashboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="flex flex-col min-h-screen bg-slate-900 text-slate-100" suppressHydrationWarning>
        <Header />

        {/* Main content */}
        <main className="flex-1 p-4 bg-slate-900">{children}</main>

        {/* Footer */}
        <footer className="w-full bg-slate-800 border-t border-slate-700 py-3 px-6">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <p>© 2025 OpenFruit Team - TESA Top Gun Rally</p>
            <div className="flex items-center space-x-4">
              <span className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>System Online</span>
              </span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
