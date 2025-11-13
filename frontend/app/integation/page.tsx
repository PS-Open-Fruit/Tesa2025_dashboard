"use client";

import "mapbox-gl/dist/mapbox-gl.css";
import dynamic from "next/dynamic";
import { useRef, useState, useEffect } from "react";
import { io } from "socket.io-client";
import { fetchDetectionshistory } from "@/app/api";
import type { DetectionItem, DetectionObject } from "@/app/type";
import { Icon } from "@iconify/react";

const Map = dynamic(() => import("@/components/map"), { ssr: false });

export default function IntegationPage() {
  const socketRefLeft = useRef<ReturnType<typeof io> | null>(null);
  const socketRefRight = useRef<ReturnType<typeof io> | null>(null);
  
  const [isConnectedLeft, setIsConnectedLeft] = useState(false);
  const [isConnectedRight, setIsConnectedRight] = useState(false);
  
  const [offenceDetection, setOffenceDetection] = useState<DetectionItem[]>([]);
  const [defenceDetection, setDefenceDetection] = useState<DetectionItem[]>([]);
  
  const [selectedMarkerLeft, setSelectedMarkerLeft] = useState<(DetectionObject & { isLost?: boolean; isNew?: boolean }) | null>(null);
  const [selectedMarkerRight, setSelectedMarkerRight] = useState<(DetectionObject & { isLost?: boolean; isNew?: boolean }) | null>(null);
  
  const [isLoadingLeft, setIsLoadingLeft] = useState(false);
  const [isLoadingRight, setIsLoadingRight] = useState(false);
  
  const offCamId = process.env.NEXT_PUBLIC_OFF_CAM || "";
  const offToken = process.env.NEXT_PUBLIC_OFF_TOKEN || "";
  const defCamId = process.env.NEXT_PUBLIC_DEF_CAM || "";
  const defToken = process.env.NEXT_PUBLIC_DEF_TOKEN || "";

  // ✅ ดึงข้อมูลตรวจจับล่าสุดจาก API สำหรับ Offence
  useEffect(() => {
    if (!offCamId || !offToken) return;

    const fetchDetections = async () => {
      setIsLoadingLeft(true);
      try {
        const json = await fetchDetectionshistory(offCamId, offToken);
        setOffenceDetection(json.data || []);
              } catch (err: any) {
        console.error("Fetch offence detections failed:", err);
      } finally {
        setIsLoadingLeft(false);
      }
    };

    fetchDetections();
  }, [offCamId, offToken]);

  // ✅ ดึงข้อมูลตรวจจับล่าสุดจาก API สำหรับ Defence
  useEffect(() => {
    if (!defCamId || !defToken) return;

    const fetchDetections = async () => {
      setIsLoadingRight(true);
      try {
        const json = await fetchDetectionshistory(defCamId, defToken);
        setDefenceDetection(json.data || []);
              } catch (err: any) {
        console.error("Fetch defence detections failed:", err);
      } finally {
        setIsLoadingRight(false);
      }
    };

    fetchDetections();
  }, [defCamId, defToken]);

  // ✅ เชื่อมต่อ Socket.IO อัตโนมัติสำหรับ Offence
  useEffect(() => {
    if (!offCamId) return;

    setIsConnectedLeft(false);
    const socket = io("https://tesa-api.crma.dev", {
      transports: ["websocket", "polling"],
    });

    socketRefLeft.current = socket;

    socket.on("connect", () => {
            setIsConnectedLeft(true);
      socket.emit("subscribe_camera", { cam_id: offCamId });
          });

    socket.on("object_detection", (data: DetectionItem) => {
            setOffenceDetection(prev => {
        const exists = prev.some(d => d.id === data.id);
        if (exists) {
          return prev.map(d => d.id === data.id ? data : d);
        }
        return [...prev, data];
      });
    });

    socket.on("connect_error", (error: any) => {
      console.error("Socket.IO Left (Offence) connection error:", error);
      setIsConnectedLeft(false);
    });

    socket.on("disconnect", (reason: string) => {
            setIsConnectedLeft(false);
    });

    return () => {
      if (socketRefLeft.current) {
        socketRefLeft.current.emit("unsubscribe_camera", { cam_id: offCamId });
        socketRefLeft.current.disconnect();
        socketRefLeft.current = null;
      }
    };
  }, [offCamId]);

  // ✅ เชื่อมต่อ Socket.IO อัตโนมัติสำหรับ Defence
  useEffect(() => {
    if (!defCamId) return;

    setIsConnectedRight(false);
    const socket = io("https://tesa-api.crma.dev", {
      transports: ["websocket", "polling"],
    });

    socketRefRight.current = socket;

    socket.on("connect", () => {
            setIsConnectedRight(true);
      socket.emit("subscribe_camera", { cam_id: defCamId });
          });

    socket.on("object_detection", (data: DetectionItem) => {
            setDefenceDetection(prev => {
        const exists = prev.some(d => d.id === data.id);
        if (exists) {
          return prev.map(d => d.id === data.id ? data : d);
        }
        return [...prev, data];
      });
    });

    socket.on("connect_error", (error: any) => {
      console.error("Socket.IO Right (Defence) connection error:", error);
      setIsConnectedRight(false);
    });

    socket.on("disconnect", (reason: string) => {
            setIsConnectedRight(false);
    });

    return () => {
      if (socketRefRight.current) {
        socketRefRight.current.emit("unsubscribe_camera", { cam_id: defCamId });
        socketRefRight.current.disconnect();
        socketRefRight.current = null;
      }
    };
  }, [defCamId]);

  return (
    <div className="w-full h-[calc(100vh-10rem)] rounded-xl overflow-hidden shadow-2xl bg-slate-800 border border-slate-700 p-4">
      <div className="grid grid-cols-2 gap-4 h-full">
        {/* Left Map - Offence */}
        <div className="relative rounded-xl overflow-hidden shadow-xl bg-slate-900 border border-slate-700">
          {/* Title Card - Offence */}
          <div className="absolute top-4 left-4 right-4 z-10">
            <div className="bg-gradient-to-r from-red-600 to-red-500 rounded-lg shadow-lg px-4 py-2.5 flex items-center justify-between backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <Icon icon="mdi:sword" width="20" height="20" className="text-white" />
                <h2 className="text-base font-bold text-white">Offense Monitor</h2>
              </div>
              <div className="flex items-center gap-3">
                {isLoadingLeft && (
                  <Icon icon="mdi:loading" width="16" height="16" className="text-white animate-spin" />
                )}
                <div className="flex items-center gap-1.5">
                  <div
                    className={`w-2.5 h-2.5 rounded-full ${
                      isConnectedLeft ? "bg-green-400 shadow-lg shadow-green-400/50 animate-pulse" : "bg-slate-400"
                    }`}
                  />
                  <span className="text-xs font-medium text-white">
                    {isConnectedLeft ? "Live" : "Offline"}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="w-full h-full" style={{ minHeight: "600px" }}>
            <Map
              latitude={14.3026}
              longitude={101.1653}
              detections={offenceDetection}
              onMarkerClick={(object) => setSelectedMarkerLeft(object)}
            />
          </div>
          
          {/* Popup Card for Left Map */}
          {selectedMarkerLeft && (
            <div className="absolute bottom-4 left-4 right-4 z-10 animate-slideIn">
              <div className="bg-slate-800 border border-red-500/50 rounded-xl shadow-2xl p-4 backdrop-blur-lg">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Icon icon="mdi:target" width="20" height="20" className="text-red-400" />
                    <h3 className="text-base font-semibold text-white">Target Details</h3>
                  </div>
                  <button
                    className="inline-flex items-center justify-center rounded-lg bg-slate-700 hover:bg-slate-600 px-3 py-1.5 text-sm font-medium text-white transition-colors"
                    onClick={() => setSelectedMarkerLeft(null)}
                  >
                    <Icon icon="mdi:close" width="16" height="16" />
                  </button>
                </div>
                <div className="h-px bg-slate-600 my-3" />
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-slate-400 text-xs mb-1">Object ID</p>
                    <p className="font-mono text-white">{selectedMarkerLeft.obj_id || "-"}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs mb-1">Type</p>
                    <p className="font-medium text-white">{selectedMarkerLeft.type || "-"}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs mb-1">Latitude</p>
                    <p className="font-mono text-white text-xs">{selectedMarkerLeft.lat || "-"}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs mb-1">Longitude</p>
                    <p className="font-mono text-white text-xs">{selectedMarkerLeft.lng || "-"}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Map - Defence */}
        <div className="relative rounded-xl overflow-hidden shadow-xl bg-slate-900 border border-slate-700">
          {/* Title Card - Defence */}
          <div className="absolute top-4 left-4 right-4 z-10">
            <div className="bg-gradient-to-r from-blue-600 to-blue-500 rounded-lg shadow-lg px-4 py-2.5 flex items-center justify-between backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <Icon icon="mdi:shield" width="20" height="20" className="text-white" />
                <h2 className="text-base font-bold text-white">Defense Monitor</h2>
              </div>
              <div className="flex items-center gap-3">
                {isLoadingRight && (
                  <Icon icon="mdi:loading" width="16" height="16" className="text-white animate-spin" />
                )}
                <div className="flex items-center gap-1.5">
                  <div
                    className={`w-2.5 h-2.5 rounded-full ${
                      isConnectedRight ? "bg-green-400 shadow-lg shadow-green-400/50 animate-pulse" : "bg-slate-400"
                    }`}
                  />
                  <span className="text-xs font-medium text-white">
                    {isConnectedRight ? "Live" : "Offline"}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="w-full h-full" style={{ minHeight: "600px" }}>
            <Map
              latitude={14.3026}
              longitude={101.1653}
              detections={defenceDetection}
              onMarkerClick={(object) => setSelectedMarkerRight(object)}
            />
          </div>
          
          {/* Popup Card for Right Map */}
          {selectedMarkerRight && (
            <div className="absolute bottom-4 left-4 right-4 z-10 animate-slideIn">
              <div className="bg-slate-800 border border-blue-500/50 rounded-xl shadow-2xl p-4 backdrop-blur-lg">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Icon icon="mdi:target" width="20" height="20" className="text-blue-400" />
                    <h3 className="text-base font-semibold text-white">Target Details</h3>
                  </div>
                  <button
                    className="inline-flex items-center justify-center rounded-lg bg-slate-700 hover:bg-slate-600 px-3 py-1.5 text-sm font-medium text-white transition-colors"
                    onClick={() => setSelectedMarkerRight(null)}
                  >
                    <Icon icon="mdi:close" width="16" height="16" />
                  </button>
                </div>
                <div className="h-px bg-slate-600 my-3" />
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-slate-400 text-xs mb-1">Object ID</p>
                    <p className="font-mono text-white">{selectedMarkerRight.obj_id || "-"}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs mb-1">Type</p>
                    <p className="font-medium text-white">{selectedMarkerRight.type || "-"}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs mb-1">Latitude</p>
                    <p className="font-mono text-white text-xs">{selectedMarkerRight.lat || "-"}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs mb-1">Longitude</p>
                    <p className="font-mono text-white text-xs">{selectedMarkerRight.lng || "-"}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
