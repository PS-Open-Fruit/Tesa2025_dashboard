"use client";

import { useEffect, useState } from "react";
import type { CameraInfoResponse } from "../../type";
import type { DetectionListResponse } from "../../type";
import { fetchDetectionshistory } from "@/app/api";

export default function ConnectedPage() {
  const [cameraInfo, setCameraInfo] = useState<CameraInfoResponse["data"] | null>(null);
  const [resultPreview, setResultPreview] = useState<string | null>(null);
  const [detections, setDetections] = useState<DetectionListResponse["data"]>([]);
  const [isLoadingDetections, setIsLoadingDetections] = useState(false);
  const [detectionsError, setDetectionsError] = useState<string | null>(null);

  const fetchDetections = async () => {
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
  };

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
            <button
              className="inline-flex items-center justify-center rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={fetchDetections}
              disabled={isLoadingDetections || !cameraInfo?.token}
            >
              {isLoadingDetections ? "กำลังโหลด..." : "ดึงข้อมูล"}
            </button>
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
                  detections.map((d) => (
                    <tr key={`${d.id}-${d.timestamp}`} className="border-t border-gray-200">
                      <td className="px-3 py-2">{d.id}</td>
                      <td className="px-3 py-2 break-all">{d.cam_id}</td>
                      <td className="px-3 py-2">{new Date(d.timestamp).toLocaleString()}</td>
                      <td className="px-3 py-2">
                        {d.image_path ? (
                          <a
                            href={d.image_path}
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
          </div>
            
        </div>
      </div>
    </div>
  );
}



