"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { io } from "socket.io-client";
import { fetchDetectionshistory } from "@/app/api";
import { DetectionItem, DetectionObject } from "@/app/type";

const Map = dynamic(() => import("@/components/map"), { ssr: false });

interface CameraInfo {
  id: string;
  name: string;
  location: string;
  latitude?: number;
  longitude?: number;
  token?: string;
}


export default function DefenseConnectedPage() {
  const router = useRouter();
  const [cameraInfo, setCameraInfo] = useState<CameraInfo | null>(null);
  const [detections, setDetections] = useState<DetectionItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [socketStatus, setSocketStatus] = useState<"connecting" | "connected" | "disconnected">("disconnected");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedMarker, setSelectedMarker] = useState<DetectionObject | null>(null);
  const socketRef = useRef<ReturnType<typeof io> | null>(null);

  const itemsPerPage = 10;
  const totalPages = Math.ceil(detections.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentDetections = detections.slice(startIndex, endIndex);

  // โหลดข้อมูลกล้องจาก session
  useEffect(() => {
    const info = sessionStorage.getItem("Dashboard_cameraInfo");
    const preview = sessionStorage.getItem("Dashboard_resultPreview");

    if (!info) {
      router.push("/defense");
      return;
    }

    try {
      const parsedInfo = JSON.parse(info);
      const parsedPreview = preview ? JSON.parse(preview) : null;

      setCameraInfo({
        id: parsedInfo.id || parsedPreview?.data?.id,
        name: parsedInfo.name || "Unknown Camera",
        location: parsedInfo.location || "Unknown Location",
        latitude: parsedInfo.latitude,
        longitude: parsedInfo.longitude,
        token: parsedPreview?.token || parsedInfo.token,
      });
    } catch (err) {
      console.error("Failed to parse camera info", err);
      router.push("/defense");
    }
  }, [router]);

  // ✅ ดึงข้อมูลตรวจจับล่าสุดจาก API จริง
  useEffect(() => {
    if (!cameraInfo?.id || !cameraInfo?.token) return;

    const fetchDetections = async () => {
      setIsLoading(true);
      setErrorMsg(null);
      try {
        // Both cameraInfo.id and cameraInfo.token are guaranteed to be string here
        const json = await fetchDetectionshistory(cameraInfo.id as string, cameraInfo.token as string);

        setDetections(json.data || []);
        console.log("Fetched detections:",json.data);
      } catch (err: any) {
        console.error("Fetch detections failed:", err);
        setErrorMsg("ไม่สามารถโหลดข้อมูลการตรวจจับได้");
      } finally {
        setIsLoading(false);
      }
    };

    fetchDetections();
  }, [cameraInfo]);

  // Reset to page 1 when detections change
  useEffect(() => {
    setCurrentPage(1);
  }, [detections.length]);

  // ✅ เชื่อมต่อ Socket.IO
  useEffect(() => {
    if (!cameraInfo?.id) return;

    setSocketStatus("connecting");

    // เชื่อมต่อ Socket.IO
    const socket = io("https://tesa-api.crma.dev", {
      transports: ["websocket", "polling"],
    });

    socketRef.current = socket;

    // เมื่อเชื่อมต่อสำเร็จ
    socket.on("connect", () => {
      console.log("Socket.IO connected:", socket.id);
      setSocketStatus("connected");
      
      // Emit subscribe_camera
      socket.emit("subscribe_camera", { cam_id: cameraInfo.id });
      console.log("Subscribed to camera:", cameraInfo.id);
    });

    socket.on('object_detection', (data : DetectionItem) => {
      console.log('Received object detection:', data);
      setDetections(prev => {
        // Check if detection with same id already exists to avoid duplicates
        const exists = prev.some(d => d.id === data.id);
        if (exists) {
          // Update existing detection instead of adding duplicate
          return prev.map(d => d.id === data.id ? data : d);
        }
        // Add new detection
        return [...prev, data];
      });
      // Process detection data here
    });

    // จัดการ error
    socket.on("connect_error", (error : string) => {
      console.error("Socket.IO connection error:", error);
      setSocketStatus("disconnected");
    });

    // จัดการ disconnect
    socket.on("disconnect", (reason: string) => {
      console.log("Socket.IO disconnected:", reason);
      setSocketStatus("disconnected");
    });

    // Cleanup เมื่อ component unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocketStatus("disconnected");
      }
    };
  }, [cameraInfo?.id]);

  return (
    <div className="min-h-[calc(100vh-2rem)] bg-white rounded-lg shadow p-3">
      <div className="w-full space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Defense Connected</h1>
          <div className="flex items-center gap-2">
            {/* Socket.IO Status Indicator */}
            <div className="flex items-center gap-2">
              <div
                className={`w-3 h-3 rounded-full ${
                  socketStatus === "connected"
                    ? "bg-green-500"
                    : socketStatus === "connecting"
                    ? "bg-yellow-500 animate-pulse"
                    : "bg-red-500"
                }`}
                title={
                  socketStatus === "connected"
                    ? "Socket.IO Connected"
                    : socketStatus === "connecting"
                    ? "Connecting..."
                    : "Socket.IO Disconnected"
                }
              />
              <span className="text-xs text-gray-600">
                {socketStatus === "connected"
                  ? "Connected"
                  : socketStatus === "connecting"
                  ? "Connecting..."
                  : "Disconnected"}
              </span>
            </div>
            <button
              className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md"
              onClick={() => {
                if (socketRef.current && cameraInfo?.id) {
                  // Unsubscribe from camera before disconnecting
                  socketRef.current.emit("unsubscribe_camera", {
                    cam_id: cameraInfo.id,
                  });
                  console.log("Unsubscribed from camera:", cameraInfo.id);
                  // Disconnect socket
                  socketRef.current.disconnect();
                }
                sessionStorage.removeItem("Dashboard_cameraInfo");
                sessionStorage.removeItem("Dashboard_resultPreview");
                router.push("/defense");
              }}
            >
              Disconnect
            </button>
          </div>
        </div>

        {/* ✅ Institute Info Card */}
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              🏫 Institute Info
            </h3>
            {cameraInfo?.location && (
              <span className="text-sm text-gray-600">
                {cameraInfo.location}
              </span>
            )}
          </div>

          {!cameraInfo ? (
            <div className="text-sm text-gray-600">
              No camera info found in session.
            </div>
          ) : (
            <div className="text-sm text-gray-700">
              <div className="font-medium mb-1">
                Institute:{" "}
                <span className="text-gray-900">{cameraInfo.name}</span>
              </div>
              <div>
                Location:{" "}
                <span className="text-gray-900">{cameraInfo.location}</span>
              </div>
            </div>
          )}
        </div>

        {/* ✅ Map Section */}
        <div className="flex gap-4 w-full overflow-hidden">
          {/* Map */}
          <div className="rounded-xl border border-gray-200 shadow-sm overflow-hidden transition-all duration-300 ease-in-out flex-1">
            <div className="bg-gray-100 px-4 py-2 border-b border-gray-200">
              <h2 className="text-sm font-semibold text-gray-700">
                แผนที่ตำแหน่งกล้อง
              </h2>
            </div>
            <div className="w-full h-[600px]">
              <Map
                latitude={cameraInfo?.latitude || 13.7563}
                longitude={cameraInfo?.longitude || 100.5018}
                detections={detections}
                onMarkerClick={(object) => setSelectedMarker(object)}
              />
            </div>
          </div>
          
          {/* Marker Details Card - แสดงเฉพาะเมื่อกดที่ marker */}
          {selectedMarker && (
            <div className="flex-[0_0_20%] min-w-[200px] max-w-[280px] rounded-xl border border-gray-200 shadow-sm bg-white overflow-hidden flex-shrink-0">
              <div className="bg-gray-100 px-4 py-2 border-b border-gray-200 flex justify-between items-center">
                <h3 className="text-sm font-semibold text-gray-700">รายละเอียด Marker</h3>
                <button
                  onClick={() => setSelectedMarker(null)}
                  className="text-gray-700 hover:text-white hover:bg-red-500 bg-white border border-gray-300 text-lg font-bold leading-none w-8 h-8 flex items-center justify-center rounded-full transition-all shadow-sm hover:shadow-md"
                  title="ปิด"
                  aria-label="ปิด"
                >
                  ×
                </button>
              </div>
              <div className="p-4 space-y-3 overflow-y-auto max-h-[600px]">
                <div>
                  <p className="text-xs text-gray-600 mb-1">Object ID</p>
                  <p className="text-sm font-medium text-gray-900">{selectedMarker.obj_id || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-1">Type</p>
                  <p className="text-sm font-medium text-gray-900">{selectedMarker.type || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-1">Latitude</p>
                  <p className="text-sm font-medium text-gray-900">{selectedMarker.lat || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-1">Longitude</p>
                  <p className="text-sm font-medium text-gray-900">{selectedMarker.lng || '-'}</p>
                </div>
                {selectedMarker.objective && (
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Objective</p>
                    <p className="text-sm font-medium text-gray-900">{selectedMarker.objective}</p>
                  </div>
                )}
                {selectedMarker.size && (
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Size</p>
                    <p className="text-sm font-medium text-gray-900">{selectedMarker.size}</p>
                  </div>
                )}
                {selectedMarker.details && (
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Details</p>
                    <pre className="text-xs font-mono text-gray-700 bg-gray-50 p-2 rounded overflow-auto">
                      {JSON.stringify(selectedMarker.details, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ✅ Recent Detections Table */}
        <div className="rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="bg-gray-100 px-4 py-2 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-sm font-semibold text-gray-700">
              รายการตรวจจับล่าสุด
            </h2>
            {isLoading && (
              <span className="text-xs text-gray-500">กำลังโหลด...</span>
            )}
          </div>

          {errorMsg ? (
            <div className="p-4 text-sm text-red-600">{errorMsg}</div>
          ) : (
            <table className="w-full text-sm text-gray-700">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">#</th>
                  <th className="px-4 py-2 text-left font-medium">Count</th>
                  <th className="px-4 py-2 text-left font-medium">Time</th>
                  <th className="px-4 py-2 text-left font-medium">Image</th>
                </tr>
              </thead>
              <tbody>
                {detections.length === 0 ? (
                  <tr key="no-data">
                    <td
                      colSpan={4}
                      className="px-4 py-3 text-center text-gray-500"
                    >
                      ไม่มีข้อมูลการตรวจจับ
                    </td>
                  </tr>
                ) : (
                  currentDetections.map((d, i) => (
                    <tr
                      key={d.id}
                      className="border-t border-gray-100 hover:bg-gray-50"
                    >
                      <td className="px-4 py-2">{d.id}</td>
                      <td className="px-4 py-2">{d.objects ? d.objects.length : 0}</td>

                      <td className="px-4 py-2">
                        {d.timestamp ? new Date(d.timestamp).toLocaleString() : "-"}
                      </td>

                      <td className="px-4 py-2">
                        {d.image_path ? (
                          <a
                              href={`https://tesa-api.crma.dev${d.image_path}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              เปิดภาพ
                            </a>

                        ) : (
                          "-"
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
          
          {/* Pagination */}
          {detections.length > 0 && totalPages > 1 && (
            <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                แสดง {startIndex + 1} - {Math.min(endIndex, detections.length)} จาก {detections.length} รายการ
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ก่อนหน้า
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-3 py-1.5 text-sm font-medium rounded-md ${
                        currentPage === page
                          ? "bg-blue-600 text-white"
                          : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ถัดไป
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

