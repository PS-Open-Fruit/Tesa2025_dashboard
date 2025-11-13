"use client";

import Link from "next/link";
import { Icon } from "@iconify/react";
import { useEffect, useState } from "react";

export default function Header() {
  const [currentTime, setCurrentTime] = useState<string>(new Date().toLocaleTimeString('th-TH'));

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
            href="/integation" 
            className="group relative px-4 py-2 rounded-lg transition-all duration-200 hover:bg-slate-700/50"
          >
            <div className="flex items-center space-x-2">
              <Icon icon="mdi:view-dashboard" width="20" height="20" className="text-purple-400 group-hover:text-purple-300" />
              <span className="text-sm font-medium text-slate-200 group-hover:text-white">Integration</span>
            </div>
          </Link>
          
          <Link 
            href="/defense" 
            className="group relative px-4 py-2 rounded-lg transition-all duration-200 hover:bg-slate-700/50"
          >
            <div className="flex items-center space-x-2">
              <Icon icon="mdi:shield" width="20" height="20" className="text-blue-400 group-hover:text-blue-300" />
              <span className="text-sm font-medium text-slate-200 group-hover:text-white">Defense</span>
            </div>
          </Link>

          <Link 
            href="/offense" 
            className="group relative px-4 py-2 rounded-lg transition-all duration-200 hover:bg-slate-700/50"
          >
            <div className="flex items-center space-x-2">
              <Icon icon="mdi:sword" width="20" height="20" className="text-red-400 group-hover:text-red-300" />
              <span className="text-sm font-medium text-slate-200 group-hover:text-white">Offense</span>
            </div>
          </Link>

          <Link 
            href="/history" 
            className="group relative px-4 py-2 rounded-lg transition-all duration-200 hover:bg-slate-700/50"
          >
            <div className="flex items-center space-x-2">
              <Icon icon="mdi:history" width="20" height="20" className="text-yellow-400 group-hover:text-yellow-300" />
              <span className="text-sm font-medium text-slate-200 group-hover:text-white">History</span>
            </div>
          </Link>
        </nav>

        {/* Real-time Clock */}
        <div className="flex items-center space-x-3">
          <div className="px-4 py-2 bg-slate-800 rounded-lg border border-slate-700">
            <div className="flex items-center space-x-2">
              <Icon icon="mdi:clock-outline" width="18" height="18" className="text-slate-400" />
              <span className="text-sm font-mono text-slate-300">
                {currentTime}
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
