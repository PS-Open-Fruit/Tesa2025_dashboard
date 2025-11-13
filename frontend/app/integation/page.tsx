"use client";

import "mapbox-gl/dist/mapbox-gl.css";
import dynamic from "next/dynamic";
import { useRef, useState, useEffect } from "react";
import { io } from "socket.io-client";
import { fetchDetectionshistory } from "@/app/api";
import type { DetectionItem, DetectionObject } from "@/app/type";

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
        console.log("Fetched offence detections:", json.data);
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
        console.log("Fetched defence detections:", json.data);
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
      console.log("Socket.IO Left (Offence) connected:", socket.id);
      setIsConnectedLeft(true);
      socket.emit("subscribe_camera", { cam_id: offCamId });
      console.log("Subscribed to camera (Offence):", offCamId);
    });

    socket.on("object_detection", (data: DetectionItem) => {
      console.log("Received object detection (Offence):", data);
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
      console.log("Socket.IO Left (Offence) disconnected:", reason);
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
      console.log("Socket.IO Right (Defence) connected:", socket.id);
      setIsConnectedRight(true);
      socket.emit("subscribe_camera", { cam_id: defCamId });
      console.log("Subscribed to camera (Defence):", defCamId);
    });

    socket.on("object_detection", (data: DetectionItem) => {
      console.log("Received object detection (Defence):", data);
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
      console.log("Socket.IO Right (Defence) disconnected:", reason);
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
    <div className="w-full h-[90vh] rounded-lg overflow-hidden shadow bg-white p-4">
      <div className="grid grid-cols-2 gap-4 h-full">
        {/* Left Map - Offence */}
        <div className="relative rounded-xl overflow-hidden shadow-md">
          {/* Title Card - Offence */}
          <div className="absolute top-4 left-4 right-4 z-10">
            <div className="bg-red-600 rounded-lg shadow-md px-4 py-2 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Offence</h2>
              <div className="flex items-center gap-2">
                {isLoadingLeft && (
                  <span className="text-xs text-white">กำลังโหลด...</span>
                )}
                <div
                  className={`w-3 h-3 rounded-full ${
                    isConnectedLeft ? "bg-green-500" : "bg-gray-400"
                  }`}
                  title={isConnectedLeft ? "Connected" : "Disconnected"}
                />
                <span className="text-xs text-white">
                  {isConnectedLeft ? "Connected" : "Disconnected"}
                </span>
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
            <div className="absolute bottom-4 left-4 right-4 z-10">
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Object Details</h3>
                  </div>
                  <button
                    className="inline-flex items-center justify-center rounded-md bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
                    onClick={() => setSelectedMarkerLeft(null)}
                  >
                    ปิด
                  </button>
                </div>
                <div className="h-px bg-gray-200 my-3" />
                <div className="space-y-2 text-sm">
                  <div>
                    <p className="text-gray-600">Object ID:</p>
                    <p className="font-medium text-gray-900">{selectedMarkerLeft.obj_id || "-"}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Type:</p>
                    <p className="font-medium text-gray-900">{selectedMarkerLeft.type || "-"}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Latitude:</p>
                    <p className="font-medium text-gray-900">{selectedMarkerLeft.lat || "-"}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Longitude:</p>
                    <p className="font-medium text-gray-900">{selectedMarkerLeft.lng || "-"}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Map - Defence */}
        <div className="relative rounded-xl overflow-hidden shadow-md">
          {/* Title Card - Defence */}
          <div className="absolute top-4 left-4 right-4 z-10">
            <div className="bg-blue-600 rounded-lg shadow-md px-4 py-2 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Defence</h2>
              <div className="flex items-center gap-2">
                {isLoadingRight && (
                  <span className="text-xs text-white">กำลังโหลด...</span>
                )}
                <div
                  className={`w-3 h-3 rounded-full ${
                    isConnectedRight ? "bg-green-500" : "bg-gray-400"
                  }`}
                  title={isConnectedRight ? "Connected" : "Disconnected"}
                />
                <span className="text-xs text-white">
                  {isConnectedRight ? "Connected" : "Disconnected"}
                </span>
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
            <div className="absolute bottom-4 left-4 right-4 z-10">
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Object Details</h3>
                  </div>
                  <button
                    className="inline-flex items-center justify-center rounded-md bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
                    onClick={() => setSelectedMarkerRight(null)}
                  >
                    ปิด
                  </button>
                </div>
                <div className="h-px bg-gray-200 my-3" />
                <div className="space-y-2 text-sm">
                  <div>
                    <p className="text-gray-600">Object ID:</p>
                    <p className="font-medium text-gray-900">{selectedMarkerRight.obj_id || "-"}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Type:</p>
                    <p className="font-medium text-gray-900">{selectedMarkerRight.type || "-"}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Latitude:</p>
                    <p className="font-medium text-gray-900">{selectedMarkerRight.lat || "-"}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Longitude:</p>
                    <p className="font-medium text-gray-900">{selectedMarkerRight.lng || "-"}</p>
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
