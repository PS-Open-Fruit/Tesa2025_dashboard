"use client";

import "mapbox-gl/dist/mapbox-gl.css";
import dynamic from "next/dynamic";
import { useRef, useState, useEffect } from "react";
import { io } from "socket.io-client";
import { fetchDetectionshistory } from "@/app/api";
import type { DetectionItem, DetectionObject } from "@/app/type";
import { Icon } from "@iconify/react";
import ImageModal from "@/components/ImageModal";

const Map = dynamic(() => import("@/components/map"), { ssr: false });

export default function RootPage() {
  const socketRefDefense = useRef<ReturnType<typeof io> | null>(null);
  const socketRefOffense = useRef<ReturnType<typeof io> | null>(null);
  
  const [isConnectedDefense, setIsConnectedDefense] = useState(false);
  const [isConnectedOffense, setIsConnectedOffense] = useState(false);
  
  const [offenseDetections, setOffenseDetections] = useState<DetectionItem[]>([]);
  const [defenseDetections, setDefenseDetections] = useState<DetectionItem[]>([]);
  const [allDetections, setAllDetections] = useState<DetectionItem[]>([]);
  
  const [selectedMarker, setSelectedMarker] = useState<(DetectionObject & { isLost?: boolean; isNew?: boolean; team?: string; timestamp?: string; image_path?: string }) | null>(null);
  const [selectedImage, setSelectedImage] = useState<{ url: string; timestamp: string; info: any } | null>(null);
  
  const [viewMode, setViewMode] = useState<"all" | "offense" | "defense" | "split">("all");
  const [showStats, setShowStats] = useState(true);
  const [maxPositions, setMaxPositions] = useState(10);
  
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
        setDefenseDetections(json.data || []);
      } catch (err: any) {
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
        setOffenseDetections(json.data || []);
      } catch (err: any) {
        console.error("Fetch offense detections failed:", err);
      } finally {
        setIsLoadingOffense(false);
      }
    };

    fetchDetections();
  }, [offCamId, offToken]);

  // Combine detections based on view mode
  useEffect(() => {
    if (viewMode === "all") {
      setAllDetections([...defenseDetections, ...offenseDetections]);
    } else if (viewMode === "defense") {
      setAllDetections(defenseDetections);
    } else {
      setAllDetections(offenseDetections);
    }
  }, [viewMode, defenseDetections, offenseDetections]);

  // Socket.IO for Defense
  useEffect(() => {
    if (!defCamId) return;

    setIsConnectedDefense(false);
    const socket = io("https://tesa-api.crma.dev", {
      transports: ["websocket", "polling"],
    });

    socketRefDefense.current = socket;

    socket.on("connect", () => {
      console.log("Socket.IO Defense connected:", socket.id);
      setIsConnectedDefense(true);
      socket.emit("subscribe_camera", { cam_id: defCamId });
    });

    socket.on("object_detection", (data: DetectionItem) => {
      console.log("Received defense detection:", data);
      setDefenseDetections(prev => {
        const exists = prev.some(d => d.id === data.id);
        if (exists) {
          return prev.map(d => d.id === data.id ? data : d);
        }
        return [data, ...prev];
      });
    });

    socket.on("connect_error", (error: any) => {
      console.error("Socket.IO Defense error:", error);
      setIsConnectedDefense(false);
    });

    socket.on("disconnect", (reason: string) => {
      console.log("Socket.IO Defense disconnected:", reason);
      setIsConnectedDefense(false);
    });

    return () => {
      if (socketRefDefense.current) {
        socketRefDefense.current.emit("unsubscribe_camera", { cam_id: defCamId });
        socketRefDefense.current.disconnect();
        socketRefDefense.current = null;
      }
    };
  }, [defCamId]);

  // Socket.IO for Offense
  useEffect(() => {
    if (!offCamId) return;

    setIsConnectedOffense(false);
    const socket = io("https://tesa-api.crma.dev", {
      transports: ["websocket", "polling"],
    });

    socketRefOffense.current = socket;

    socket.on("connect", () => {
      console.log("Socket.IO Offense connected:", socket.id);
      setIsConnectedOffense(true);
      socket.emit("subscribe_camera", { cam_id: offCamId });
    });

    socket.on("object_detection", (data: DetectionItem) => {
      console.log("Received offense detection:", data);
      setOffenseDetections(prev => {
        const exists = prev.some(d => d.id === data.id);
        if (exists) {
          return prev.map(d => d.id === data.id ? data : d);
        }
        return [data, ...prev];
      });
    });

    socket.on("connect_error", (error: any) => {
      console.error("Socket.IO Offense error:", error);
      setIsConnectedOffense(false);
    });

    socket.on("disconnect", (reason: string) => {
      console.log("Socket.IO Offense disconnected:", reason);
      setIsConnectedOffense(false);
    });

    return () => {
      if (socketRefOffense.current) {
        socketRefOffense.current.emit("unsubscribe_camera", { cam_id: offCamId });
        socketRefOffense.current.disconnect();
        socketRefOffense.current = null;
      }
    };
  }, [offCamId]);

  // Calculate statistics
  const stats = {
    totalDefense: defenseDetections.length,
    totalOffense: offenseDetections.length,
    activeDefense: defenseDetections.filter(d => {
      const time = new Date(d.timestamp).getTime();
      return Date.now() - time < 300000; // Last 5 minutes
    }).length,
    activeOffense: offenseDetections.filter(d => {
      const time = new Date(d.timestamp).getTime();
      return Date.now() - time < 300000;
    }).length,
  };

  return (
    <div className="w-full h-full flex gap-4 p-4">
      {/* Left Sidebar - Stats & Controls */}
      <div className={`flex flex-col gap-4 transition-all duration-300 ${showStats ? 'w-80' : 'w-16'} overflow-y-auto`}>
        {/* Toggle Stats Button */}
        <button
          onClick={() => setShowStats(!showStats)}
          className="bg-gradient-to-r from-purple-600 to-purple-500 border border-purple-400 rounded-xl p-3 hover:from-purple-700 hover:to-purple-600 transition-all shadow-lg hover:shadow-purple-500/50 flex-shrink-0"
          title={showStats ? "Hide Stats" : "Show Stats"}
        >
          <Icon 
            icon={showStats ? "mdi:chevron-left" : "mdi:chevron-right"} 
            width="24" 
            height="24" 
            className="text-white mx-auto"
          />
        </button>

        {showStats && (
          <>
            {/* View Mode Selector - MOVED TO TOP */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-xl p-4 flex-shrink-0">
              <div className="flex items-center gap-2 mb-3">
                <Icon icon="mdi:view-dashboard" width="20" height="20" className="text-purple-400" />
                <p className="text-sm text-white font-bold">View Mode</p>
              </div>
              <div className="space-y-2">
                <button
                  onClick={() => setViewMode("all")}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all font-medium ${
                    viewMode === "all" 
                      ? "bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow-lg shadow-purple-500/50 scale-105" 
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
                      ? "bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/50 scale-105" 
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
                      ? "bg-gradient-to-r from-red-600 to-red-500 text-white shadow-lg shadow-red-500/50 scale-105" 
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
                      ? "bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-lg shadow-emerald-500/50 scale-105" 
                      : "bg-slate-700 text-slate-300 hover:bg-slate-600 hover:scale-102"
                  }`}
                >
                  <Icon icon="mdi:view-split-vertical" width="20" height="20" />
                  <span className="text-sm">Split View</span>
                  {viewMode === "split" && <Icon icon="mdi:check-circle" width="18" height="18" className="ml-auto" />}
                </button>
              </div>
            </div>

            {/* Overall Stats */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-xl shadow-xl p-5 flex-shrink-0 hover:border-purple-600/70 transition-all cursor-pointer"
                 onClick={() => setViewMode("all")}
                 title="Click to view all data">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <Icon icon="mdi:monitor-dashboard" width="24" height="24" className="text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Overview</h2>
                  <p className="text-xs text-slate-400">Real-time Monitoring</p>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="bg-slate-900/50 rounded-lg p-3">
                  <p className="text-xs text-slate-400 mb-1">Total Detections</p>
                  <p className="text-2xl font-bold text-white">{stats.totalDefense + stats.totalOffense}</p>
                </div>
                <div className="bg-slate-900/50 rounded-lg p-3">
                  <p className="text-xs text-slate-400 mb-1">Active (5 min)</p>
                  <p className="text-2xl font-bold text-green-400">{stats.activeDefense + stats.activeOffense}</p>
                </div>
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
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="flex justify-between text-xs text-slate-500 mt-1">
                    <span>1</span>
                    <span>50</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Defense Stats */}
            <div className="bg-gradient-to-br from-blue-900/30 to-slate-800 border border-blue-700/50 rounded-xl shadow-xl p-5 hover:border-blue-600/70 transition-all cursor-pointer"
                 onClick={() => setViewMode("defense")}
                 title="Click to focus on Defense">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Icon icon="mdi:shield" width="20" height="20" className="text-blue-400" />
                  <h3 className="text-sm font-bold text-white">Defense</h3>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${isConnectedDefense ? "bg-green-400 animate-pulse" : "bg-slate-500"}`} />
                  <span className="text-xs text-slate-400">{isConnectedDefense ? "Live" : "Offline"}</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-400">Total</span>
                  <span className="text-lg font-bold text-blue-400">{stats.totalDefense}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-400">Active</span>
                  <span className="text-lg font-bold text-green-400">{stats.activeDefense}</span>
                </div>
              </div>
            </div>

            {/* Offense Stats */}
            <div className="bg-gradient-to-br from-red-900/30 to-slate-800 border border-red-700/50 rounded-xl shadow-xl p-5 hover:border-red-600/70 transition-all cursor-pointer"
                 onClick={() => setViewMode("offense")}
                 title="Click to focus on Offense">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Icon icon="mdi:sword" width="20" height="20" className="text-red-400" />
                  <h3 className="text-sm font-bold text-white">Offense</h3>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${isConnectedOffense ? "bg-green-400 animate-pulse" : "bg-slate-500"}`} />
                  <span className="text-xs text-slate-400">{isConnectedOffense ? "Live" : "Offline"}</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-400">Total</span>
                  <span className="text-lg font-bold text-red-400">{stats.totalOffense}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-400">Active</span>
                  <span className="text-lg font-bold text-green-400">{stats.activeOffense}</span>
                </div>
              </div>
            </div>
          </>
        )}
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
              <div className="absolute top-2 left-2 right-2 z-10 bg-blue-900/90 backdrop-blur-md rounded-lg px-4 py-2 border border-blue-600 animate-slideDown">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon icon="mdi:shield" width="20" height="20" className="text-blue-400" />
                    <span className="text-sm font-bold text-white">Defense Team</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full ${isConnectedDefense ? "bg-green-400 animate-pulse" : "bg-slate-500"}`} />
                    <span className="text-xs text-slate-300">{isConnectedDefense ? "Live" : "Offline"}</span>
                  </div>
                </div>
              </div>
              <Map
                latitude={14.3026}
                longitude={101.1653}
                detections={defenseDetections}
                onMarkerClick={(object) => setSelectedMarker({ ...object })}
                teamColors={teamColors}
                maxPositions={maxPositions}
              />
            </div>

            {/* Offense Map */}
            <div className="flex-1 relative rounded-lg overflow-hidden border-2 border-red-600/50 transition-all duration-500 ease-in-out transform">
              <div className="absolute top-2 left-2 right-2 z-10 bg-red-900/90 backdrop-blur-md rounded-lg px-4 py-2 border border-red-600 animate-slideDown">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon icon="mdi:sword" width="20" height="20" className="text-red-400" />
                    <span className="text-sm font-bold text-white">Offense Team</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full ${isConnectedOffense ? "bg-green-400 animate-pulse" : "bg-slate-500"}`} />
                    <span className="text-xs text-slate-300">{isConnectedOffense ? "Live" : "Offline"}</span>
                  </div>
                </div>
              </div>
              <Map
                latitude={14.3026}
                longitude={101.1653}
                detections={offenseDetections}
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
            <div className="bg-slate-800/95 backdrop-blur-lg border border-slate-700 rounded-xl shadow-2xl p-5 max-w-4xl mx-auto">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
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

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Detection Image */}
                {selectedMarker.image_path && (
                  <div className="bg-slate-900/50 rounded-lg p-3 overflow-hidden">
                    <p className="text-xs text-slate-400 mb-2">Real-time Feed</p>
                    <img 
                      src={`https://tesa-api.crma.dev${selectedMarker.image_path}`} 
                      alt={`Detection ${selectedMarker.obj_id}`}
                      className="w-full h-auto rounded-lg border border-slate-600"
                      onError={(e) => {
                        e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect fill="%23334155" width="400" height="300"/><text x="50%" y="50%" fill="%2394a3b8" text-anchor="middle" dy=".3em">Image not available</text></svg>';
                      }}
                    />
                  </div>
                )}

                {/* Detection Details */}
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-900/50 rounded-lg p-3">
                      <p className="text-xs text-slate-400 mb-1">Type</p>
                      <p className="text-sm font-semibold text-white capitalize">{selectedMarker.type || "Unknown"}</p>
                    </div>
                    <div className="bg-slate-900/50 rounded-lg p-3">
                      <p className="text-xs text-slate-400 mb-1">Objective</p>
                      <p className="text-sm font-semibold text-white capitalize">{selectedMarker.objective || "N/A"}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-900/50 rounded-lg p-3">
                      <p className="text-xs text-slate-400 mb-1">Size</p>
                      <p className="text-sm font-semibold text-white capitalize">{selectedMarker.size || "N/A"}</p>
                    </div>
                    <div className="bg-slate-900/50 rounded-lg p-3">
                      <p className="text-xs text-slate-400 mb-1">Status</p>
                      {(() => {
                        if (!selectedMarker.timestamp) return <p className="text-sm font-semibold text-slate-400">Unknown</p>;
                        const timeDiff = Date.now() - new Date(selectedMarker.timestamp).getTime();
                        const isActive = timeDiff < 60000; // 1 minutes
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

