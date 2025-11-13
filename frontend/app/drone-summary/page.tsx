"use client";

import { useEffect, useState, useMemo } from "react";
import { fetchDetectionshistory } from "@/app/api";
import type { DetectionItem, DetectionObject } from "@/app/type";
import { Icon } from "@iconify/react";
import Link from "next/link";

interface DroneStats {
  obj_id: string;
  type: string;
  totalDetections: number;
  firstSeen: string;
  lastSeen: string;
  locations: Array<{ lat: number; lng: number; timestamp: string }>;
  cameras: Set<string>;
  objectives: Set<string>;
  sizes: Set<string>;
  averageLat: number;
  averageLng: number;
}

export default function DroneSummaryPage() {
  const [defenseDetections, setDefenseDetections] = useState<DetectionItem[]>([]);
  const [offenseDetections, setOffenseDetections] = useState<DetectionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDrone, setSelectedDrone] = useState<DroneStats | null>(null);
  const [filterTeam, setFilterTeam] = useState<"all" | "defense" | "offense">("all");
  const [sortBy, setSortBy] = useState<"detections" | "recent" | "id">("detections");

  const offCamId = process.env.NEXT_PUBLIC_OFF_CAM || "";
  const offToken = process.env.NEXT_PUBLIC_OFF_TOKEN || "";
  const defCamId = process.env.NEXT_PUBLIC_DEF_CAM || "";
  const defToken = process.env.NEXT_PUBLIC_DEF_TOKEN || "";

  // Fetch data
  useEffect(() => {
    const fetchAllData = async () => {
      setIsLoading(true);
      try {
        const [defenseData, offenseData] = await Promise.all([
          defCamId && defToken ? fetchDetectionshistory(defCamId, defToken) : Promise.resolve({ data: [] }),
          offCamId && offToken ? fetchDetectionshistory(offCamId, offToken) : Promise.resolve({ data: [] }),
        ]);

        setDefenseDetections(defenseData.data || []);
        setOffenseDetections(offenseData.data || []);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllData();
  }, [defCamId, defToken, offCamId, offToken]);

  // Process drone statistics
  const droneStats = useMemo(() => {
    const allDetections = [...defenseDetections, ...offenseDetections];
    const droneMap = new Map<string, DroneStats>();

    allDetections.forEach((detection) => {
      detection.objects?.forEach((obj) => {
        if (!obj.obj_id) return;

        const team = detection.cam_id === defCamId ? "defense" : "offense";
        const key = `${obj.obj_id}-${team}`;

        if (!droneMap.has(key)) {
          droneMap.set(key, {
            obj_id: obj.obj_id,
            type: obj.type || "Unknown",
            totalDetections: 0,
            firstSeen: detection.timestamp,
            lastSeen: detection.timestamp,
            locations: [],
            cameras: new Set(),
            objectives: new Set(),
            sizes: new Set(),
            averageLat: 0,
            averageLng: 0,
          });
        }

        const stats = droneMap.get(key)!;
        stats.totalDetections++;
        stats.cameras.add(detection.cam_id);
        
        if (obj.objective) stats.objectives.add(obj.objective);
        if (obj.size) stats.sizes.add(obj.size);

        const lat = typeof obj.lat === "string" ? parseFloat(obj.lat) : obj.lat;
        const lng = typeof obj.lng === "string" ? parseFloat(obj.lng) : obj.lng;

        if (!isNaN(lat) && !isNaN(lng)) {
          stats.locations.push({ lat, lng, timestamp: detection.timestamp });
        }

        if (new Date(detection.timestamp) > new Date(stats.lastSeen)) {
          stats.lastSeen = detection.timestamp;
        }
        if (new Date(detection.timestamp) < new Date(stats.firstSeen)) {
          stats.firstSeen = detection.timestamp;
        }
      });
    });

    // Calculate average positions
    droneMap.forEach((stats) => {
      if (stats.locations.length > 0) {
        stats.averageLat = stats.locations.reduce((sum, loc) => sum + loc.lat, 0) / stats.locations.length;
        stats.averageLng = stats.locations.reduce((sum, loc) => sum + loc.lng, 0) / stats.locations.length;
      }
    });

    return Array.from(droneMap.values());
  }, [defenseDetections, offenseDetections, defCamId]);

  // Filter and sort drones
  const filteredDrones = useMemo(() => {
    let filtered = droneStats;

    // Filter by team
    if (filterTeam !== "all") {
      filtered = filtered.filter((drone) => {
        const isDefense = drone.cameras.has(defCamId);
        return filterTeam === "defense" ? isDefense : !isDefense;
      });
    }

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "detections":
          return b.totalDetections - a.totalDetections;
        case "recent":
          return new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime();
        case "id":
          return a.obj_id.localeCompare(b.obj_id);
        default:
          return 0;
      }
    });

    return sorted;
  }, [droneStats, filterTeam, sortBy, defCamId]);

  // Calculate overall statistics
  const overallStats = useMemo(() => {
    const totalDrones = droneStats.length;
    const defenseDrones = droneStats.filter(d => d.cameras.has(defCamId)).length;
    const offenseDrones = droneStats.filter(d => d.cameras.has(offCamId)).length;
    const totalDetections = droneStats.reduce((sum, d) => sum + d.totalDetections, 0);
    
    const now = Date.now();
    const activeInLast5Min = droneStats.filter(d => 
      now - new Date(d.lastSeen).getTime() < 300000
    ).length;
    const activeInLast1Hour = droneStats.filter(d => 
      now - new Date(d.lastSeen).getTime() < 3600000
    ).length;

    return {
      totalDrones,
      defenseDrones,
      offenseDrones,
      totalDetections,
      activeInLast5Min,
      activeInLast1Hour,
    };
  }, [droneStats, defCamId, offCamId]);

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatDuration = (start: string, end: string) => {
    const duration = new Date(end).getTime() - new Date(start).getTime();
    const minutes = Math.floor(duration / 60000);
    const hours = Math.floor(minutes / 60);
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    return `${minutes}m`;
  };

  const getTeamColor = (drone: DroneStats) => {
    return drone.cameras.has(defCamId) ? "blue" : "red";
  };

  const getTeamName = (drone: DroneStats) => {
    return drone.cameras.has(defCamId) ? "Defense" : "Offense";
  };

  if (isLoading) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <Icon icon="mdi:loading" width="48" height="48" className="text-purple-500 animate-spin" />
          <p className="text-slate-400">Loading drone data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-slate-950 p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
              <Icon icon="mdi:quadcopter" width="28" height="28" className="text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Drone Summary Dashboard</h1>
              <p className="text-slate-400 text-sm">Comprehensive drone detection analytics</p>
            </div>
          </div>
          <Link 
            href="/"
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg flex items-center gap-2 transition-colors border border-slate-700"
          >
            <Icon icon="mdi:arrow-left" width="20" height="20" />
            Back to Map
          </Link>
        </div>

        {/* Overall Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-xl p-4 hover:border-purple-500 transition-all">
            <div className="flex items-center gap-2 mb-2">
              <Icon icon="mdi:quadcopter" width="20" height="20" className="text-purple-400" />
              <p className="text-xs text-slate-400">Total Drones</p>
            </div>
            <p className="text-3xl font-bold text-white">{overallStats.totalDrones}</p>
          </div>

          <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-xl p-4 hover:border-blue-500 transition-all">
            <div className="flex items-center gap-2 mb-2">
              <Icon icon="mdi:shield" width="20" height="20" className="text-blue-400" />
              <p className="text-xs text-slate-400">Defense Drones</p>
            </div>
            <p className="text-3xl font-bold text-blue-400">{overallStats.defenseDrones}</p>
          </div>

          <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-xl p-4 hover:border-red-500 transition-all">
            <div className="flex items-center gap-2 mb-2">
              <Icon icon="mdi:sword" width="20" height="20" className="text-red-400" />
              <p className="text-xs text-slate-400">Offense Drones</p>
            </div>
            <p className="text-3xl font-bold text-red-400">{overallStats.offenseDrones}</p>
          </div>

          <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-xl p-4 hover:border-green-500 transition-all">
            <div className="flex items-center gap-2 mb-2">
              <Icon icon="mdi:eye" width="20" height="20" className="text-green-400" />
              <p className="text-xs text-slate-400">Total Detections</p>
            </div>
            <p className="text-3xl font-bold text-green-400">{overallStats.totalDetections}</p>
          </div>

          <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-xl p-4 hover:border-yellow-500 transition-all">
            <div className="flex items-center gap-2 mb-2">
              <Icon icon="mdi:clock-fast" width="20" height="20" className="text-yellow-400" />
              <p className="text-xs text-slate-400">Active (5 min)</p>
            </div>
            <p className="text-3xl font-bold text-yellow-400">{overallStats.activeInLast5Min}</p>
          </div>

          <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-xl p-4 hover:border-orange-500 transition-all">
            <div className="flex items-center gap-2 mb-2">
              <Icon icon="mdi:clock-outline" width="20" height="20" className="text-orange-400" />
              <p className="text-xs text-slate-400">Active (1 hour)</p>
            </div>
            <p className="text-3xl font-bold text-orange-400">{overallStats.activeInLast1Hour}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Icon icon="mdi:filter" width="20" height="20" className="text-slate-400" />
            <span className="text-sm text-slate-300">Filter by Team:</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setFilterTeam("all")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filterTeam === "all"
                  ? "bg-purple-600 text-white"
                  : "bg-slate-700 text-slate-300 hover:bg-slate-600"
              }`}
            >
              All Teams
            </button>
            <button
              onClick={() => setFilterTeam("defense")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filterTeam === "defense"
                  ? "bg-blue-600 text-white"
                  : "bg-slate-700 text-slate-300 hover:bg-slate-600"
              }`}
            >
              Defense
            </button>
            <button
              onClick={() => setFilterTeam("offense")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filterTeam === "offense"
                  ? "bg-red-600 text-white"
                  : "bg-slate-700 text-slate-300 hover:bg-slate-600"
              }`}
            >
              Offense
            </button>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <Icon icon="mdi:sort" width="20" height="20" className="text-slate-400" />
            <span className="text-sm text-slate-300">Sort by:</span>
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="detections">Most Detections</option>
            <option value="recent">Most Recent</option>
            <option value="id">Drone ID</option>
          </select>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Drone List */}
        <div className="lg:col-span-2">
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-slate-700 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Icon icon="mdi:format-list-bulleted" width="24" height="24" className="text-purple-400" />
                Detected Drones ({filteredDrones.length})
              </h2>
            </div>
            <div className="overflow-y-auto max-h-[calc(100vh-300px)]">
              {filteredDrones.length === 0 ? (
                <div className="p-8 text-center">
                  <Icon icon="mdi:drone" width="48" height="48" className="text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400">No drones detected</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-700">
                  {filteredDrones.map((drone) => {
                    const teamColor = getTeamColor(drone);
                    const teamName = getTeamName(drone);
                    const isActive = Date.now() - new Date(drone.lastSeen).getTime() < 300000;

                    return (
                      <button
                        key={`${drone.obj_id}-${teamName}`}
                        onClick={() => setSelectedDrone(drone)}
                        className={`w-full p-4 text-left hover:bg-slate-750 transition-colors ${
                          selectedDrone?.obj_id === drone.obj_id && getTeamName(selectedDrone) === teamName ? "bg-slate-700" : ""
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <div className={`w-10 h-10 bg-${teamColor}-500/20 rounded-lg flex items-center justify-center flex-shrink-0`}>
                              <Icon icon="mdi:quadcopter" width="24" height="24" className={`text-${teamColor}-400`} />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="text-white font-semibold">{drone.obj_id}</h3>
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                  teamColor === "blue" 
                                    ? "bg-blue-500/20 text-blue-400" 
                                    : "bg-red-500/20 text-red-400"
                                }`}>
                                  {teamName}
                                </span>
                                {isActive && (
                                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-500/20 text-green-400 flex items-center gap-1">
                                    <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                                    Active
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-wrap gap-3 text-xs text-slate-400">
                                <span className="flex items-center gap-1">
                                  <Icon icon="mdi:tag" width="14" height="14" />
                                  {drone.type}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Icon icon="mdi:eye" width="14" height="14" />
                                  {drone.totalDetections} detections
                                </span>
                                <span className="flex items-center gap-1">
                                  <Icon icon="mdi:map-marker" width="14" height="14" />
                                  {drone.locations.length} positions
                                </span>
                                <span className="flex items-center gap-1">
                                  <Icon icon="mdi:clock-outline" width="14" height="14" />
                                  {formatDuration(drone.firstSeen, drone.lastSeen)}
                                </span>
                              </div>
                            </div>
                          </div>
                          <Icon icon="mdi:chevron-right" width="20" height="20" className="text-slate-500" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Drone Details Panel */}
        <div className="lg:col-span-1">
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden sticky top-6">
            {selectedDrone ? (
              <>
                <div className="p-4 border-b border-slate-700 bg-gradient-to-r from-purple-900/30 to-slate-800">
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Icon icon="mdi:information" width="24" height="24" className="text-purple-400" />
                    Drone Details
                  </h2>
                </div>
                <div className="p-4 space-y-4 max-h-[calc(100vh-300px)] overflow-y-auto">
                  {/* Drone ID */}
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Drone ID</p>
                    <p className="text-lg font-bold text-white">{selectedDrone.obj_id}</p>
                  </div>

                  {/* Team */}
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Team</p>
                    <span className={`inline-block px-3 py-1 rounded-lg text-sm font-medium ${
                      getTeamColor(selectedDrone) === "blue"
                        ? "bg-blue-500/20 text-blue-400"
                        : "bg-red-500/20 text-red-400"
                    }`}>
                      {getTeamName(selectedDrone)}
                    </span>
                  </div>

                  {/* Type */}
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Type</p>
                    <p className="text-white">{selectedDrone.type}</p>
                  </div>

                  {/* Statistics */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-900/50 rounded-lg p-3">
                      <p className="text-xs text-slate-400 mb-1">Detections</p>
                      <p className="text-2xl font-bold text-purple-400">{selectedDrone.totalDetections}</p>
                    </div>
                    <div className="bg-slate-900/50 rounded-lg p-3">
                      <p className="text-xs text-slate-400 mb-1">Positions</p>
                      <p className="text-2xl font-bold text-green-400">{selectedDrone.locations.length}</p>
                    </div>
                  </div>

                  {/* Time Information */}
                  <div className="space-y-2">
                    <div className="bg-slate-900/50 rounded-lg p-3">
                      <p className="text-xs text-slate-400 mb-1">First Seen</p>
                      <p className="text-sm text-white">{formatTimestamp(selectedDrone.firstSeen)}</p>
                    </div>
                    <div className="bg-slate-900/50 rounded-lg p-3">
                      <p className="text-xs text-slate-400 mb-1">Last Seen</p>
                      <p className="text-sm text-white">{formatTimestamp(selectedDrone.lastSeen)}</p>
                    </div>
                    <div className="bg-slate-900/50 rounded-lg p-3">
                      <p className="text-xs text-slate-400 mb-1">Duration</p>
                      <p className="text-sm text-white">{formatDuration(selectedDrone.firstSeen, selectedDrone.lastSeen)}</p>
                    </div>
                  </div>

                  {/* Average Position */}
                  <div className="bg-slate-900/50 rounded-lg p-3">
                    <p className="text-xs text-slate-400 mb-2">Average Position</p>
                    <div className="space-y-1">
                      <p className="text-sm text-white">
                        <span className="text-slate-400">Lat:</span> {selectedDrone.averageLat.toFixed(6)}
                      </p>
                      <p className="text-sm text-white">
                        <span className="text-slate-400">Lng:</span> {selectedDrone.averageLng.toFixed(6)}
                      </p>
                    </div>
                  </div>

                  {/* Objectives */}
                  {selectedDrone.objectives.size > 0 && (
                    <div>
                      <p className="text-xs text-slate-400 mb-2">Objectives</p>
                      <div className="flex flex-wrap gap-2">
                        {Array.from(selectedDrone.objectives).map((obj) => (
                          <span key={obj} className="px-2 py-1 bg-orange-500/20 text-orange-400 rounded text-xs">
                            {obj}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Sizes */}
                  {selectedDrone.sizes.size > 0 && (
                    <div>
                      <p className="text-xs text-slate-400 mb-2">Sizes</p>
                      <div className="flex flex-wrap gap-2">
                        {Array.from(selectedDrone.sizes).map((size) => (
                          <span key={size} className="px-2 py-1 bg-cyan-500/20 text-cyan-400 rounded text-xs">
                            {size}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Cameras */}
                  <div>
                    <p className="text-xs text-slate-400 mb-2">Detected By Cameras</p>
                    <div className="space-y-1">
                      {Array.from(selectedDrone.cameras).map((camId) => (
                        <div key={camId} className="flex items-center gap-2 text-sm">
                          <Icon icon="mdi:camera" width="16" height="16" className="text-slate-400" />
                          <span className="text-white">{camId}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Recent Locations */}
                  <div>
                    <p className="text-xs text-slate-400 mb-2">Recent Locations (Last 5)</p>
                    <div className="space-y-2">
                      {selectedDrone.locations.slice(-5).reverse().map((loc, idx) => (
                        <div key={idx} className="bg-slate-900/50 rounded-lg p-2">
                          <p className="text-xs text-slate-400 mb-1">{formatTimestamp(loc.timestamp)}</p>
                          <p className="text-xs text-white">
                            {loc.lat.toFixed(6)}, {loc.lng.toFixed(6)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="p-8 text-center">
                <Icon icon="mdi:cursor-pointer" width="48" height="48" className="text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400">Select a drone to view details</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
