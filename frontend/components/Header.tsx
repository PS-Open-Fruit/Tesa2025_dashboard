"use client";

import Link from "next/link";
import { Icon } from "@iconify/react";
import { useEffect, useState, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";

function HeaderContent() {
  const [currentTime, setCurrentTime] = useState<string>('');
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const mode = searchParams.get('mode') || 'live';

  useEffect(() => {
    // Update every second
    const interval = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('th-TH'));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <header className="w-full bg-gradient-to-r from-slate-800 to-slate-900 border-b border-slate-700 shadow-lg">
      <div className="flex items-center justify-between px-6 py-3">
        {/* Logo & Title */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg">
            <Icon icon="mdi:shield-alert" width="24" height="24" className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">OpenFruit Dashboard</h1>
            <p className="text-xs text-slate-400">TESA 2025 Competition</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex items-center gap-1">
          <Link 
            href="/?mode=live" 
            className={`group relative px-4 py-2 rounded-lg transition-all duration-200 ${
              pathname === '/' && mode === 'live'
                ? 'bg-purple-600/20 border border-purple-500/50'
                : 'hover:bg-slate-700/50'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Icon icon="mdi:satellite-uplink" width="20" height="20" className="text-purple-400 group-hover:text-purple-300" />
              <span className="text-sm font-medium text-slate-200 group-hover:text-white">Live View</span>
            </div>
          </Link>

          <Link 
            href="/?mode=history" 
            className={`group relative px-4 py-2 rounded-lg transition-all duration-200 ${
              pathname === '/' && mode === 'history'
                ? 'bg-purple-600/20 border border-purple-500/50'
                : 'hover:bg-slate-700/50'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Icon icon="mdi:history" width="20" height="20" className="text-purple-400 group-hover:text-purple-300" />
              <span className="text-sm font-medium text-slate-200 group-hover:text-white">History</span>
            </div>
          </Link>

          <Link 
            href="/drone-summary" 
            className={`group relative px-4 py-2 rounded-lg transition-all duration-200 ${
              pathname === '/drone-summary'
                ? 'bg-purple-600/20 border border-purple-500/50'
                : 'hover:bg-slate-700/50'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Icon icon="mdi:view-dashboard" width="20" height="20" className="text-purple-400 group-hover:text-purple-300" />
              <span className="text-sm font-medium text-slate-200 group-hover:text-white">Summary</span>
            </div>
          </Link>
        </nav>

        {/* Real-time Clock */}
        <div className="flex items-center space-x-3">
          <div className="px-4 py-2 bg-slate-800 rounded-lg border border-slate-700">
            <div className="flex items-center space-x-2">
              <Icon icon="mdi:clock-outline" width="18" height="18" className="text-slate-400" />
              <span className="text-sm font-mono text-slate-300" suppressHydrationWarning>
                {currentTime || '00:00:00'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

export default function Header() {
  return (
    <Suspense fallback={
      <header className="w-full bg-gradient-to-r from-slate-800 to-slate-900 border-b border-slate-700 shadow-lg">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="text-white">Loading...</div>
        </div>
      </header>
    }>
      <HeaderContent />
    </Suspense>
  );
}
