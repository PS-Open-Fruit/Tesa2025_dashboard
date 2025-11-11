"use client";

import "mapbox-gl/dist/mapbox-gl.css";
import Map, { Marker } from "react-map-gl/mapbox-legacy";
import { useEffect, useState, useCallback } from "react";
import type { CameraInfoResponse } from "../../type";
import type { DetectionListResponse } from "../../type";
import { fetchDetectionshistory } from "@/app/api";

export default function ConnectedPage() {
  const [cameraInfo, setCameraInfo] = useState<CameraInfoResponse["data"] | null>(null);
  const [resultPreview, setResultPreview] = useState<string | null>(null);
  const [detections, setDetections] = useState<DetectionListResponse["data"]>([]);
  const [isLoadingDetections, setIsLoadingDetections] = useState(false);
  const [detectionsError, setDetectionsError] = useState<string | null>(null);
  const [hasCustomCameraLocation, setHasCustomCameraLocation] = useState(false);

  const DEFAULT_MAP_COORDINATES = { latitude: 13.736717, longitude: 100.523186, zoom: 12 };
  const [mapViewState, setMapViewState] = useState(DEFAULT_MAP_COORDINATES);

  const extractCoordinates = (rawLocation?: string | null) => {
    if (!rawLocation) {
      return null;
    }
    const numberMatches = rawLocation.match(/-?\d+(\.\d+)?/g);
    if (!numberMatches || numberMatches.length < 2) {
      return null;
    }
    const latitude = parseFloat(numberMatches[0]);
    const longitude = parseFloat(numberMatches[1]);
    if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
      return null;
    }
    return { latitude, longitude };
  };

  const fetchDetections = useCallback(async () => {
    setIsLoadingDetections(true);
    setDetectionsError(null);
    try {
      if (!cameraInfo) {
        throw new Error("ไม่พบข้อมูลกล้อง");
      }
      const data: DetectionListResponse = await fetchDetectionshistory(
        cameraInfo.id,
        cameraInfo.token
      );
      if (!data?.success) {
        throw new Error((data as any)?.message || "โหลดข้อมูลไม่สำเร็จ");
      }
      setDetections(data?.data ?? []);
    } catch (err: any) {
      setDetectionsError(err?.message || "เกิดข้อผิดพลาด");
    } finally {
      setIsLoadingDetections(false);
    }
  }, [cameraInfo]);

  // Removed Socket.IO connection for now

  useEffect(() => {
    try {
      const infoRaw = sessionStorage.getItem("Dashboard_cameraInfo");
      const resultRaw = sessionStorage.getItem("Dashboard_resultPreview");
      if (infoRaw) {
        setCameraInfo(JSON.parse(infoRaw));
      }
      if (resultRaw) {
        // stored as JSON string; show pretty if JSON
        try {
          const parsed = JSON.parse(resultRaw);
          setResultPreview(JSON.stringify(parsed, null, 2));
        } catch {
          setResultPreview(resultRaw);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  // Auto-load detections once camera info is available
  useEffect(() => {
    if (cameraInfo?.token) {
      fetchDetections();
    }
  }, [cameraInfo?.token, fetchDetections]);

  // Log full detections data whenever it changes
  useEffect(() => {
    if (detections) {
      // Raw object (expandable in DevTools)
      console.log("detections:", detections);
      // Pretty JSON string (ensures full snapshot is visible)
      try {
        console.log("detections JSON:", JSON.stringify(detections, null, 2));
      } catch {
        // ignore stringify errors
      }
    }
  }, [detections]);

  // Update map view based on camera location
  useEffect(() => {
    const coords = extractCoordinates(cameraInfo?.location);
    if (coords) {
      setHasCustomCameraLocation(true);
      setMapViewState((prev) => ({
        ...prev,
        ...coords,
      }));
    } else {
      setHasCustomCameraLocation(false);
      setMapViewState((prev) => ({
        ...prev,
        latitude: DEFAULT_MAP_COORDINATES.latitude,
        longitude: DEFAULT_MAP_COORDINATES.longitude,
      }));
    }
  }, [cameraInfo?.location]);


  const buildImageUrl = (camId: string, imagePath: string) => {
    if (!camId || !imagePath) {
      return null;
    }
    const sanitizedPath = imagePath.split("?")[0];
    const segments = sanitizedPath.split("/").filter(Boolean);
    const filename = segments[segments.length - 1];
    if (!filename) {
      return null;
    }
    return `https://tesa-api.crma.dev/api/files/${camId}/${filename}`;
  };

  // Try to read coordinates from each detection item
  const getDetectionCoords = (d: NonNullable<DetectionListResponse["data"]>[number]) => {
    const anyD: any = d as any;
    const latitude = anyD?.lat ?? anyD?.latitude ?? anyD?.geo_lat ?? null;
    const longitude = anyD?.lng ?? anyD?.lon ?? anyD?.longitude ?? anyD?.geo_lng ?? null;
    if (typeof latitude === "number" && typeof longitude === "number") {
      return { latitude, longitude };
    }
    return null;
  };

  return (
    <div className="w-full min-h-[calc(100vh-2rem)] rounded-lg overflow-hidden shadow bg-white p-6">
      <div className="max-w-3xl mx-auto">
        <div className="w-full rounded-xl bg-white border border-gray-200 shadow p-5 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Connected</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left: API Result Preview */}
            <div className="rounded-lg border border-gray-200 p-4 bg-gray-50">
              <div className="text-sm font-medium text-gray-800 mb-2">API Result</div>
              {resultPreview ? (
                <pre className="max-h-64 overflow-auto rounded-md bg-white border border-gray-200 p-3 text-xs text-gray-800">
                  {resultPreview}
                </pre>
              ) : (
                <div className="text-sm text-gray-600">No API result to display.</div>
              )}
            </div>

            {/* Right: Camera Info */}
            <div className="rounded-lg border border-gray-200 p-4 bg-gray-50">
              <div className="text-sm font-medium text-gray-800 mb-2">Camera Info</div>
              {cameraInfo ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-500">Team ID</span>
                    <div className="font-medium text-gray-900 break-all">{cameraInfo.id}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Team Name</span>
                    <div className="font-medium text-gray-900">{cameraInfo.name}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Location</span>
                    <div className="font-medium text-gray-900">{cameraInfo.location}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Token</span>
                    <div className="font-mono text-gray-900 break-all">{cameraInfo.token}</div>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-gray-500">Created At</span>
                    <div className="font-medium text-gray-900">
                      {new Date(cameraInfo.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-600">No camera info found in session.</div>
              )}
            </div>
          </div>

          {/* Socket status removed */}

          <div className="h-px bg-gray-200 my-4" />

          <div className="flex items-center justify-between mb-2">
            <h3 className="text-base font-semibold text-gray-900">รายการตรวจจับล่าสุด</h3>
            <div className="text-sm text-gray-600">
              {isLoadingDetections ? "กำลังโหลด..." : null}
            </div>
          </div>

          {detectionsError && <div className="text-sm text-red-600 mb-2">{detectionsError}</div>}

          <div className="overflow-auto border border-gray-200 rounded-md">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-700">
                <tr>
                  <th className="px-3 py-2 font-medium">ID</th>
                  <th className="px-3 py-2 font-medium">Camera ID</th>
                  <th className="px-3 py-2 font-medium">Timestamp</th>
                  <th className="px-3 py-2 font-medium">Image</th>
                </tr>
              </thead>
              <tbody>
                {(!detections || detections.length === 0) ? (
                  <tr>
                    <td className="px-3 py-3 text-gray-500" colSpan={4}>
                      ไม่มีข้อมูล
                    </td>
                  </tr>
                ) : (
                  detections.map((d) => {
                    const imageUrl = buildImageUrl(d.cam_id, d.image_path);
                    return (
                      <tr key={`${d.id}-${d.timestamp}`} className="border-t border-gray-200">
                        <td className="px-3 py-2">{d.id}</td>
                        <td className="px-3 py-2 break-all">{d.cam_id}</td>
                        <td className="px-3 py-2">{new Date(d.timestamp).toLocaleString()}</td>
                        <td className="px-3 py-2">
                          {imageUrl ? (
                            <a
                              href={imageUrl}
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
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="h-px bg-gray-200 my-4" />
          <div>
            <h4 className="text-base font-semibold text-gray-900 mb-2">ตำแหน่งบนแผนที่</h4>
            <div className="text-sm text-gray-600 mb-3">
              {hasCustomCameraLocation
                ? `พิกัดจากข้อมูลกล้อง: ${cameraInfo?.location}`
                : "ไม่พบพิกัดจากข้อมูลกล้อง แสดงตำแหน่งเริ่มต้น (กรุงเทพมหานคร)"}
            </div>
            <div className="w-full h-80 rounded-lg overflow-hidden border border-gray-200">
              <Map
                mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
                mapStyle="mapbox://styles/mapbox/streets-v12"
                style={{ width: "100%", height: "100%" }}
                initialViewState={mapViewState}
              >
                {/* Camera marker (center) */}
                <Marker longitude={mapViewState.longitude} latitude={mapViewState.latitude}>
                  <div className="w-3 h-3 rounded-full bg-blue-600 border border-white shadow" />
                </Marker>
                {/* Detection markers in red, when coordinates exist on each item */}
                {detections?.map((d) => {
                  const coords = getDetectionCoords(d);
                  if (!coords) return null;
                  return (
                    <Marker
                      key={`${d.id}-${d.timestamp}-marker`}
                      longitude={coords.longitude}
                      latitude={coords.latitude}
                    >
                      <div className="w-3 h-3 rounded-full bg-red-600 border border-white shadow" />
                    </Marker>
                  );
                })}
              </Map>
            </div>
          </div>
            
        </div>
      </div>
    </div>
  );
}



