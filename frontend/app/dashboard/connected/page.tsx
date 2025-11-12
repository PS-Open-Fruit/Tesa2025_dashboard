"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { fetchDetectionshistory } from "@/app/api";
import { DetectionItem } from "@/app/type";

const Map = dynamic(() => import("@/components/map"), { ssr: false });

interface CameraInfo {
  id: string;
  name: string;
  location: string;
  latitude?: number;
  longitude?: number;
  token?: string;
}


export default function ConnectedPage() {
  const router = useRouter();
  const [cameraInfo, setCameraInfo] = useState<CameraInfo | null>(null);
  const [detections, setDetections] = useState<DetectionItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // โหลดข้อมูลกล้องจาก session
  useEffect(() => {
    const info = sessionStorage.getItem("Dashboard_cameraInfo");
    const preview = sessionStorage.getItem("Dashboard_resultPreview");

    if (!info) {
      router.push("/dashboard");
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
      router.push("/dashboard");
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

  return (
    <div className="min-h-[calc(100vh-2rem)] bg-white rounded-lg shadow p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Connected</h1>
          <button
            className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md"
            onClick={() => {
              sessionStorage.removeItem("Dashboard_cameraInfo");
              sessionStorage.removeItem("Dashboard_resultPreview");
              router.push("/dashboard");
            }}
          >
            Disconnect
          </button>
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
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-3 text-center text-gray-500"
                    >
                      ไม่มีข้อมูลการตรวจจับ
                    </td>
                  </tr>
                ) : (
                  detections.map((d, i) => (
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
        </div>

        {/* ✅ Map Section */}
        <div className="rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="bg-gray-100 px-4 py-2 border-b border-gray-200">
            <h2 className="text-sm font-semibold text-gray-700">
              แผนที่ตำแหน่งกล้อง
            </h2>
          </div>
          <div className="w-full h-[400px]">
            <Map
              latitude={cameraInfo?.latitude || 13.7563}
              longitude={cameraInfo?.longitude || 100.5018}
              detections={detections}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
