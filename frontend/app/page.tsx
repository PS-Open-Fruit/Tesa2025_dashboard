"use client";

import "mapbox-gl/dist/mapbox-gl.css";
import dynamic from "next/dynamic";
import { useRef, useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { io } from "socket.io-client";
import { fetchDetectionshistory } from "@/app/api";
import type { DetectionItem, DetectionObject } from "@/app/type";
import { Icon } from "@iconify/react";
import ImageModal from "@/components/ImageModal";
import Link from "next/link";

const Map = dynamic(() => import("@/components/map"), { ssr: false });

export default function RootPage() {
  const searchParams = useSearchParams();
  const pageMode = (searchParams.get('mode') || 'live') as "live" | "history";
  
  const socketRefDefense = useRef<ReturnType<typeof io> | null>(null);
  const socketRefOffense = useRef<ReturnType<typeof io> | null>(null);
  
  const [isConnectedDefense, setIsConnectedDefense] = useState(false);
  const [isConnectedOffense, setIsConnectedOffense] = useState(false);
  
  const [offenseDetections, setOffenseDetections] = useState<DetectionItem[]>([]);
  const [defenseDetections, setDefenseDetections] = useState<DetectionItem[]>([]);
  
  const [selectedMarker, setSelectedMarker] = useState<(DetectionObject & { isLost?: boolean; isNew?: boolean; team?: string; timestamp?: string; image_path?: string }) | null>(null);
  const [selectedImage, setSelectedImage] = useState<{ url: string; timestamp: string; info: any } | null>(null);
  const [showCameraFeed, setShowCameraFeed] = useState<"defense" | "offense" | null>(null);
  
  const [viewMode, setViewMode] = useState<"all" | "offense" | "defense" | "split">("all");
  const [maxPositions, setMaxPositions] = useState(10);
  const [defenseImageUrl, setDefenseImageUrl] = useState<string>("");
  
  // History mode states
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [filteredOffenseDetections, setFilteredOffenseDetections] = useState<DetectionItem[]>([]);
  const [filteredDefenseDetections, setFilteredDefenseDetections] = useState<DetectionItem[]>([]);
  
  const [isLoadingDefense, setIsLoadingDefense] = useState(false);
  const [isLoadingOffense, setIsLoadingOffense] = useState(false);

  const offCamId = process.env.NEXT_PUBLIC_OFF_CAM || "";
  const offToken = process.env.NEXT_PUBLIC_OFF_TOKEN || "";
  const defCamId = process.env.NEXT_PUBLIC_DEF_CAM || "";
  const defToken = process.env.NEXT_PUBLIC_DEF_TOKEN || "";

  // Define team colors for map markers
  const teamColors: { [camId: string]: string } = {
    [defCamId]: "#3b82f6", // Blue for Defense
    [offCamId]: "#ef4444",  // Red for Offense
  };

  // Fetch Defense detections
  useEffect(() => {
    if (!defCamId || !defToken) return;

    const fetchDetections = async () => {
      setIsLoadingDefense(true);
      try {
        const json = await fetchDetectionshistory(defCamId, defToken);
        const sorted = (json.data || []).sort((a: DetectionItem, b: DetectionItem) => 
          new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime()
        );
        setDefenseDetections(sorted);
        setFilteredDefenseDetections(sorted);
      } catch (err: unknown) {
        console.error("Fetch defense detections failed:", err);
      } finally {
        setIsLoadingDefense(false);
      }
    };

    fetchDetections();
  }, [defCamId, defToken]);

  // Fetch Offense detections
  useEffect(() => {
    if (!offCamId || !offToken) return;

    const fetchDetections = async () => {
      setIsLoadingOffense(true);
      try {
        const json = await fetchDetectionshistory(offCamId, offToken);
        const sorted = (json.data || []).sort((a: DetectionItem, b: DetectionItem) => 
          new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime()
        );
        setOffenseDetections(sorted);
        setFilteredOffenseDetections(sorted);
      } catch (err: unknown) {
        console.error("Fetch offense detections failed:", err);
      } finally {
        setIsLoadingOffense(false);
      }
    };

    fetchDetections();
  }, [offCamId, offToken]);

  // Update Defense image URL when new detection arrives
  useEffect(() => {
    const latestDetection = defenseDetections[0];
    if (latestDetection?.image_path) {
      const newUrl = `https://tesa-api.crma.dev${latestDetection.image_path}?t=${latestDetection.id}`;
      setDefenseImageUrl(newUrl);
    }
  }, [defenseDetections]);

  // Combine detections based on view mode (memoized to prevent flickering)
  const allDetections = useMemo(() => {
    const source = pageMode === "history" 
      ? { defense: filteredDefenseDetections, offense: filteredOffenseDetections }
      : { defense: defenseDetections, offense: offenseDetections };
      
    if (viewMode === "all") {
      return [...source.defense, ...source.offense];
    } else if (viewMode === "defense") {
      return source.defense;
    } else {
      return source.offense;
    }
  }, [viewMode, defenseDetections, offenseDetections, filteredDefenseDetections, filteredOffenseDetections, pageMode]);

  // Socket.IO for Defense
  useEffect(() => {
    if (!defCamId || pageMode === "history") return;

    setIsConnectedDefense(false);
    const socket = io("https://tesa-api.crma.dev", {
      transports: ["websocket", "polling"],
    });

    socketRefDefense.current = socket;

    socket.on("connect", () => {
      setIsConnectedDefense(true);
      socket.emit("subscribe_camera", { cam_id: defCamId });
    });

    socket.on("object_detection", (data: DetectionItem) => {
      data.image_path = data.image.path;
      setDefenseDetections(prev => {
        const exists = prev.some(d => d.timestamp === data.timestamp && d.cam_id === data.cam_id);
        if (exists) {
          return prev.map(d => (d.timestamp === data.timestamp && d.cam_id === data.cam_id) ? data : d);
        }
        return [data, ...prev];
      });
    });

    socket.on("connect_error", (error: unknown) => {
      console.error("Socket.IO Defense error:", error);
      setIsConnectedDefense(false);
    });

    socket.on("disconnect", () => {
      setIsConnectedDefense(false);
    });

    return () => {
      if (socketRefDefense.current) {
        socketRefDefense.current.emit("unsubscribe_camera", { cam_id: defCamId });
        socketRefDefense.current.disconnect();
        socketRefDefense.current = null;
      }
    };
  }, [defCamId, pageMode]);

  // Socket.IO for Offense
  useEffect(() => {
    if (!offCamId || pageMode === "history") return;

    setIsConnectedOffense(false);
    const socket = io("https://tesa-api.crma.dev", {
      transports: ["websocket", "polling"],
    });

    socketRefOffense.current = socket;

    socket.on("connect", () => {
      setIsConnectedOffense(true);
      socket.emit("subscribe_camera", { cam_id: offCamId });
    });

    socket.on("object_detection", (data: DetectionItem) => {
      // @ts-expect-error - image property exists in runtime data
      data.image_path = data.image.path;
      setOffenseDetections(prev => {
        const exists = prev.some(d => d.timestamp === data.timestamp && d.cam_id === data.cam_id);
        if (exists) {
          return prev.map(d => (d.timestamp === data.timestamp && d.cam_id === data.cam_id) ? data : d);
        }
        return [data, ...prev];
      });
    });

    socket.on("connect_error", (error: unknown) => {
      console.error("Socket.IO Offense error:", error);
      setIsConnectedOffense(false);
    });

    socket.on("disconnect", () => {
      setIsConnectedOffense(false);
    });

    return () => {
      if (socketRefOffense.current) {
        socketRefOffense.current.emit("unsubscribe_camera", { cam_id: offCamId });
        socketRefOffense.current.disconnect();
        socketRefOffense.current = null;
      }
    };
  }, [offCamId, pageMode]);

  // Filter detections by time range
  const handleHistorySearch = () => {
    if (!startTime || !endTime) {
      alert("Please select both start and end time");
      return;
    }

    const startDate = new Date(startTime);
    const endDate = new Date(endTime);

    const filterByTime = (detections: DetectionItem[]) => {
      return detections.filter(d => {
        const timestamp = new Date(d.timestamp || 0);
        return timestamp >= startDate && timestamp <= endDate;
      });
    };

    setFilteredDefenseDetections(filterByTime(defenseDetections));
    setFilteredOffenseDetections(filterByTime(offenseDetections));
  };

  // Calculate statistics
  const stats = useMemo(() => {
    const now = Date.now();
    
    // Time-based active detections
    const activeDefense = defenseDetections.filter(d => {
      const time = new Date(d.timestamp).getTime();
      return now - time < 300000; // Last 5 minutes
    });
    
    const activeOffense = offenseDetections.filter(d => {
      const time = new Date(d.timestamp).getTime();
      return now - time < 300000;
    });

    // Unique drones tracking with team separation
    const defenseUniqueIds = new Set<string>();
    const offenseUniqueIds = new Set<string>();
    const allUniqueIds = new Set<string>();
    
    defenseDetections.forEach(d => {
      d.objects?.forEach(obj => {
        if (obj.obj_id) {
          defenseUniqueIds.add(obj.obj_id);
          allUniqueIds.add(obj.obj_id);
        }
      });
    });
    
    offenseDetections.forEach(d => {
      d.objects?.forEach(obj => {
        if (obj.obj_id) {
          offenseUniqueIds.add(obj.obj_id);
          allUniqueIds.add(obj.obj_id);
        }
      });
    });

    // Calculate total objects detected
    const totalDefenseObjects = defenseDetections.reduce((sum, d) => sum + (d.objects?.length || 0), 0);
    const totalOffenseObjects = offenseDetections.reduce((sum, d) => sum + (d.objects?.length || 0), 0);

    // Detection rate (detections per hour)
    const getDetectionRate = (detections: DetectionItem[]) => {
      if (detections.length === 0) return 0;
      const timestamps = detections.map(d => new Date(d.timestamp).getTime());
      const earliest = Math.min(...timestamps);
      const latest = Math.max(...timestamps);
      const hours = (latest - earliest) / (1000 * 60 * 60);
      return hours > 0 ? Math.round(detections.length / hours) : 0;
    };

    // Average objects per detection
    const avgDefenseObjects = defenseDetections.length > 0 
      ? (totalDefenseObjects / defenseDetections.length).toFixed(1)
      : '0.0';
    
    const avgOffenseObjects = offenseDetections.length > 0 
      ? (totalOffenseObjects / offenseDetections.length).toFixed(1)
      : '0.0';

    // Most recent detection time
    const latestDefenseTime = defenseDetections.length > 0 
      ? new Date(defenseDetections[0].timestamp).getTime()
      : 0;
    
    const latestOffenseTime = offenseDetections.length > 0 
      ? new Date(offenseDetections[0].timestamp).getTime()
      : 0;

    // Time since last detection
    const timeSinceDefense = latestDefenseTime > 0 
      ? Math.floor((now - latestDefenseTime) / 1000)
      : null;
    
    const timeSinceOffense = latestOffenseTime > 0 
      ? Math.floor((now - latestOffenseTime) / 1000)
      : null;

    return {
      totalDefense: defenseDetections.length,
      totalOffense: offenseDetections.length,
      activeDefense: activeDefense.length,
      activeOffense: activeOffense.length,
      uniqueDefenseDrones: defenseUniqueIds.size,
      uniqueOffenseDrones: offenseUniqueIds.size,
      totalUniqueDrones: allUniqueIds.size,
      totalDefenseObjects,
      totalOffenseObjects,
      avgDefenseObjects,
      avgOffenseObjects,
      defenseDetectionRate: getDetectionRate(defenseDetections),
      offenseDetectionRate: getDetectionRate(offenseDetections),
      timeSinceDefense,
      timeSinceOffense,
    };
  }, [defenseDetections, offenseDetections]);

  return (
    <div className="w-full h-full flex flex-col gap-4 p-4">
      {/* History Time Filter */}
      {pageMode === "history" && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 shadow-lg">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Icon icon="mdi:calendar-start" width="20" height="20" className="text-purple-400" />
              <label className="text-sm text-slate-300">Start:</label>
              <input
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <Icon icon="mdi:calendar-end" width="20" height="20" className="text-purple-400" />
              <label className="text-sm text-slate-300">End:</label>
              <input
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <button
              onClick={handleHistorySearch}
              className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <Icon icon="mdi:magnify" width="20" height="20" />
              Search
            </button>
          </div>
        </div>
      )}

      {/* Content based on mode */}
      <div className="flex-1 flex gap-4 overflow-hidden">
        {/* Left Sidebar - Stats & Controls */}
        <div className="w-80 flex flex-col gap-4 overflow-y-auto">
          {/* Camera Feed Display - Only in Live Mode */}
          {pageMode === "live" && (
            <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Icon icon="mdi:video" width="20" height="20" className="text-purple-400" />
                  <p className="text-sm text-white font-bold">Camera Feeds</p>
                </div>
              </div>
              
              <div className="space-y-3">
                {/* Defense Feed */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Icon icon="mdi:shield" width="16" height="16" className="text-blue-400" />
                    <p className="text-xs text-blue-400 font-semibold">Defense</p>
                  </div>
                  {(() => {
                    const latestDetection = defenseDetections[0];
                    
                    if (!defenseImageUrl) {
                      return (
                        <div className="bg-slate-900/50 rounded-lg p-6 text-center">
                          <Icon icon="mdi:camera-off" width="32" height="32" className="text-slate-600 mx-auto mb-1" />
                          <p className="text-xs text-slate-500">No feed</p>
                        </div>
                      );
                    }
                    
                    return (
                      <div className="space-y-2">
                        <img 
                          key={defenseImageUrl}
                          src={defenseImageUrl} 
                          alt="Defense camera feed"
                          className="w-full h-auto rounded-lg border border-blue-600/50 cursor-pointer hover:border-blue-500 transition-colors"
                          onClick={() => setShowCameraFeed(showCameraFeed === "defense" ? null : "defense")}
                          onError={(e) => {
                            e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect fill="%23334155" width="400" height="300"/><text x="50%" y="50%" fill="%2394a3b8" text-anchor="middle" dy=".3em">Feed unavailable</text></svg>';
                          }}
                        />
                        {latestDetection && (
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-400">
                              {latestDetection.objects?.length || 0} drone(s)
                            </span>
                            <span className="text-slate-500">
                              {new Date(latestDetection.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* View Mode Selector */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-xl p-4 shrink-0">
            <div className="flex items-center gap-2 mb-3">
              <Icon icon="mdi:view-dashboard" width="20" height="20" className="text-purple-400" />
              <p className="text-sm text-white font-bold">View Mode</p>
            </div>
            <div className="space-y-2">
              <button
                onClick={() => setViewMode("all")}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all font-medium ${
                  viewMode === "all" 
                    ? "bg-linear-to-r from-purple-600 to-purple-500 text-white shadow-lg shadow-purple-500/50 scale-105" 
                    : "bg-slate-700 text-slate-300 hover:bg-slate-600 hover:scale-102"
                }`}
              >
                <Icon icon="mdi:eye" width="20" height="20" />
                <span className="text-sm">All Teams</span>
                {viewMode === "all" && <Icon icon="mdi:check-circle" width="18" height="18" className="ml-auto" />}
              </button>
              <button
                onClick={() => setViewMode("defense")}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all font-medium ${
                  viewMode === "defense" 
                    ? "bg-linear-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/50 scale-105" 
                    : "bg-slate-700 text-slate-300 hover:bg-slate-600 hover:scale-102"
                }`}
              >
                <Icon icon="mdi:shield" width="20" height="20" />
                <span className="text-sm">Defense Only</span>
                {viewMode === "defense" && <Icon icon="mdi:check-circle" width="18" height="18" className="ml-auto" />}
              </button>
              <button
                onClick={() => setViewMode("offense")}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all font-medium ${
                  viewMode === "offense" 
                    ? "bg-linear-to-r from-red-600 to-red-500 text-white shadow-lg shadow-red-500/50 scale-105" 
                    : "bg-slate-700 text-slate-300 hover:bg-slate-600 hover:scale-102"
                }`}
              >
                <Icon icon="mdi:sword" width="20" height="20" />
                <span className="text-sm">Offense Only</span>
                {viewMode === "offense" && <Icon icon="mdi:check-circle" width="18" height="18" className="ml-auto" />}
              </button>
              <button
                onClick={() => setViewMode("split")}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all font-medium ${
                  viewMode === "split" 
                    ? "bg-linear-to-r from-emerald-600 to-emerald-500 text-white shadow-lg shadow-emerald-500/50 scale-105" 
                    : "bg-slate-700 text-slate-300 hover:bg-slate-600 hover:scale-102"
                }`}
              >
                <Icon icon="mdi:view-split-vertical" width="20" height="20" />
                <span className="text-sm">Split View</span>
                {viewMode === "split" && <Icon icon="mdi:check-circle" width="18" height="18" className="ml-auto" />}
              </button>
            </div>
          </div>

          {/* Overview Stats */}
          <div className="bg-linear-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-xl shadow-xl p-5 hover:border-purple-600/70 transition-all">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-linear-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Icon icon="mdi:monitor-dashboard" width="24" height="24" className="text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Overview</h2>
                <p className="text-xs text-slate-400">{pageMode === "live" ? "Real-time Monitoring" : "Historical Data"}</p>
              </div>
            </div>
            
            <div className="space-y-3">
              {/* Total Detections */}
              <div className="bg-slate-900/50 rounded-lg p-3">
                <p className="text-xs text-slate-400 mb-2">Total Detections</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon icon="mdi:shield" width="14" height="14" className="text-blue-400" />
                    <span className="text-sm text-slate-300">Defense:</span>
                    <span className="text-lg font-bold text-blue-400">{stats.totalDefense}</span>
                  </div>
                  {pageMode === "live" && (
                    <div className="flex items-center gap-1.5">
                      <div className={`w-2 h-2 rounded-full ${isConnectedDefense ? "bg-green-400 animate-pulse" : "bg-slate-500"}`} />
                      <span className="text-xs text-slate-500">{isConnectedDefense ? "Live" : "Off"}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-2">
                    <Icon icon="mdi:sword" width="14" height="14" className="text-red-400" />
                    <span className="text-sm text-slate-300">Offense:</span>
                    <span className="text-lg font-bold text-red-400">{stats.totalOffense}</span>
                  </div>
                  {pageMode === "live" && (
                    <div className="flex items-center gap-1.5">
                      <div className={`w-2 h-2 rounded-full ${isConnectedOffense ? "bg-green-400 animate-pulse" : "bg-slate-500"}`} />
                      <span className="text-xs text-slate-500">{isConnectedOffense ? "Live" : "Off"}</span>
                    </div>
                  )}
                </div>
              </div>

              {pageMode === "live" && (
                <div className="bg-slate-900/50 rounded-lg p-3">
                  <p className="text-xs text-slate-400 mb-2">Active (Last 5 min)</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon icon="mdi:shield" width="14" height="14" className="text-blue-400" />
                      <span className="text-sm text-slate-300">Defense:</span>
                      <span className="text-lg font-bold text-green-400">{stats.activeDefense}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2">
                      <Icon icon="mdi:sword" width="14" height="14" className="text-red-400" />
                      <span className="text-sm text-slate-300">Offense:</span>
                      <span className="text-lg font-bold text-green-400">{stats.activeOffense}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Drones Count by Team */}
              <div className="bg-slate-900/50 rounded-lg p-3">
                <p className="text-xs text-slate-400 mb-2">Drones by Team</p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon icon="mdi:shield" width="16" height="16" className="text-blue-400" />
                      <span className="text-sm text-slate-300">Defense:</span>
                    </div>
                    <span className="text-xl font-bold text-blue-400">{stats.uniqueDefenseDrones}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon icon="mdi:sword" width="16" height="16" className="text-red-400" />
                      <span className="text-sm text-slate-300">Offense:</span>
                    </div>
                    <span className="text-xl font-bold text-red-400">{stats.uniqueOffenseDrones}</span>
                  </div>
                  <div className="pt-2 border-t border-slate-700/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon icon="mdi:quadcopter" width="16" height="16" className="text-purple-400" />
                        <span className="text-sm text-slate-300">Total:</span>
                      </div>
                      <span className="text-xl font-bold text-purple-400">{stats.totalUniqueDrones}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Detection Rate */}
              {pageMode === "history" && (
                <div className="bg-slate-900/50 rounded-lg p-3">
                  <p className="text-xs text-slate-400 mb-2">Detection Rate</p>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Icon icon="mdi:shield" width="12" height="12" className="text-blue-400" />
                        <span className="text-xs text-slate-400">Defense:</span>
                      </div>
                      <span className="text-sm font-bold text-blue-400">{stats.defenseDetectionRate}/hr</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Icon icon="mdi:sword" width="12" height="12" className="text-red-400" />
                        <span className="text-xs text-slate-400">Offense:</span>
                      </div>
                      <span className="text-sm font-bold text-red-400">{stats.offenseDetectionRate}/hr</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Time Since Last Detection - Only in Live Mode */}
              {pageMode === "live" && (
                <div className="bg-slate-900/50 rounded-lg p-3">
                  <p className="text-xs text-slate-400 mb-2">Last Detection</p>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Icon icon="mdi:shield" width="12" height="12" className="text-blue-400" />
                        <span className="text-xs text-slate-400">Defense:</span>
                      </div>
                      <span className="text-xs font-semibold text-blue-400">
                        {stats.timeSinceDefense !== null
                          ? stats.timeSinceDefense < 60
                            ? `${stats.timeSinceDefense}s ago`
                            : stats.timeSinceDefense < 3600
                            ? `${Math.floor(stats.timeSinceDefense / 60)}m ago`
                            : `${Math.floor(stats.timeSinceDefense / 3600)}h ago`
                          : 'N/A'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Icon icon="mdi:sword" width="12" height="12" className="text-red-400" />
                        <span className="text-xs text-slate-400">Offense:</span>
                      </div>
                      <span className="text-xs font-semibold text-red-400">
                        {stats.timeSinceOffense !== null
                          ? stats.timeSinceOffense < 60
                            ? `${stats.timeSinceOffense}s ago`
                            : stats.timeSinceOffense < 3600
                            ? `${Math.floor(stats.timeSinceOffense / 60)}m ago`
                            : `${Math.floor(stats.timeSinceOffense / 3600)}h ago`
                          : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Trail Length */}
              <div className="bg-slate-900/50 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-slate-400">Trail Length</p>
                  <p className="text-xs font-semibold text-purple-400">{maxPositions}</p>
                </div>
                <input
                  type="range"
                  min="1"
                  max="50"
                  value={maxPositions}
                  onChange={(e) => setMaxPositions(Number(e.target.value))}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>1</span>
                  <span>50</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Map Area */}
        <div className="flex-1 relative rounded-xl overflow-hidden shadow-2xl bg-slate-900 border border-slate-700">
          {/* Loading Indicator */}
          {(isLoadingDefense || isLoadingOffense) && (
            <div className="absolute top-4 right-4 z-20 bg-slate-800/95 backdrop-blur-md rounded-lg px-4 py-2 border border-slate-700">
              <Icon icon="mdi:loading" width="20" height="20" className="text-yellow-400 animate-spin" />
            </div>
          )}

          {/* Map Component(s) */}
          {viewMode === "split" ? (
            <div className="w-full h-full flex gap-2 p-2 animate-fadeIn">
              {/* Defense Map */}
              <div className="flex-1 relative rounded-lg overflow-hidden border-2 border-blue-600/50 transition-all duration-500 ease-in-out transform">
                <Map
                  latitude={14.3026}
                  longitude={101.1653}
                  detections={pageMode === "history" ? filteredDefenseDetections : defenseDetections}
                  onMarkerClick={(object) => setSelectedMarker({ ...object })}
                  teamColors={teamColors}
                  maxPositions={maxPositions}
                />
              </div>

              {/* Offense Map */}
              <div className="flex-1 relative rounded-lg overflow-hidden border-2 border-red-600/50 transition-all duration-500 ease-in-out transform">
                <Map
                  latitude={14.3026}
                  longitude={101.1653}
                  detections={pageMode === "history" ? filteredOffenseDetections : offenseDetections}
                  onMarkerClick={(object) => setSelectedMarker({ ...object })}
                  teamColors={teamColors}
                  maxPositions={maxPositions}
                />
              </div>
            </div>
          ) : (
            <div className="w-full h-full animate-fadeIn">
              <Map
                latitude={14.3026}
                longitude={101.1653}
                detections={allDetections}
                onMarkerClick={(object) => setSelectedMarker({ ...object })}
                teamColors={teamColors}
                maxPositions={maxPositions}
              />
            </div>
          )}

          {/* Selected Object Info Card */}
          {selectedMarker && (
            <div className="absolute bottom-4 left-4 right-4 z-10 animate-slideIn">
              <div className="bg-slate-800/95 backdrop-blur-lg border border-slate-700 rounded-xl shadow-2xl p-5 max-w-2xl mx-auto">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-linear-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                      <Icon icon="mdi:crosshairs-gps" width="24" height="24" className="text-white" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white">Detection Details</h3>
                      <p className="text-xs text-slate-400">Object ID: {selectedMarker.obj_id}</p>
                    </div>
                  </div>
                  <button
                    className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                    onClick={() => setSelectedMarker(null)}
                  >
                    <Icon icon="mdi:close" width="20" height="20" className="text-slate-400" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-4 gap-4">
                    <div className="bg-slate-900/50 rounded-lg p-3">
                      <p className="text-xs text-slate-400 mb-1">Type</p>
                      <p className="text-sm font-semibold text-white capitalize">{selectedMarker.type || "Unknown"}</p>
                    </div>
                    <div className="bg-slate-900/50 rounded-lg p-3">
                      <p className="text-xs text-slate-400 mb-1">Objective</p>
                      <p className="text-sm font-semibold text-white capitalize">{selectedMarker.objective || "N/A"}</p>
                    </div>
                    <div className="bg-slate-900/50 rounded-lg p-3">
                      <p className="text-xs text-slate-400 mb-1">Size</p>
                      <p className="text-sm font-semibold text-white capitalize">{selectedMarker.size || "N/A"}</p>
                    </div>
                    <div className="bg-slate-900/50 rounded-lg p-3">
                      <p className="text-xs text-slate-400 mb-1">Status</p>
                      {(() => {
                        if (!selectedMarker.timestamp) return <p className="text-sm font-semibold text-slate-400">Unknown</p>;
                        const timeDiff = Date.now() - new Date(selectedMarker.timestamp).getTime();
                        const isActive = timeDiff < 60000; // 1 minute
                        return (
                          <p className={`text-sm font-semibold ${isActive ? 'text-green-400' : 'text-slate-400'}`}>
                            {isActive ? 'Active' : 'Inactive'}
                          </p>
                        );
                      })()}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-900/50 rounded-lg p-3">
                      <p className="text-xs text-slate-400 mb-1">Latitude</p>
                      <p className="text-sm font-mono text-white">{selectedMarker.lat}</p>
                    </div>
                    <div className="bg-slate-900/50 rounded-lg p-3">
                      <p className="text-xs text-slate-400 mb-1">Longitude</p>
                      <p className="text-sm font-mono text-white">{selectedMarker.lng}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Legend - Only show in non-split view */}
          {viewMode !== "split" && (
            <div className="absolute top-4 right-4 z-10">
              <div className="bg-slate-800/95 backdrop-blur-md rounded-lg shadow-lg px-4 py-3 border border-slate-700">
                <p className="text-xs font-semibold text-slate-400 mb-2">Legend</p>
                <div className="space-y-2">
                {viewMode === "all" && (
                  <>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span className="text-xs text-white">Defense</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <span className="text-xs text-white">Offense</span>
                    </div>
                  </>
                )}
                {viewMode === "defense" && (
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span className="text-xs text-white">Defense</span>
                  </div>
                )}
                {viewMode === "offense" && (
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span className="text-xs text-white">Offense</span>
                  </div>
                )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Image Modal */}
      {selectedImage && (
        <ImageModal
          isOpen={!!selectedImage}
          onClose={() => setSelectedImage(null)}
          imageUrl={selectedImage.url}
          timestamp={selectedImage.timestamp}
          detectionInfo={selectedImage.info}
        />
      )}
    </div>
  );
}
