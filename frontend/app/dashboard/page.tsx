"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { fetchCameraInfo } from "../api"; // เพิ่มบรรทัดนี้
import type { CameraInfoResponse } from "../type";

export default function DashboardPage() {
  const [cameraId, setCameraId] = useState("");
  const [token, setToken] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectMessage, setConnectMessage] = useState<string | null>(null);
  const [resultPreview, setResultPreview] = useState<string | null>(null);
  const [cameraInfo, setCameraInfo] = useState<CameraInfoResponse["data"] | null>(null);
  const router = useRouter();

  const handleConnect = async () => {
    setIsConnecting(true);
    setConnectMessage(null);
    setResultPreview(null);
    try {
      const data = await fetchCameraInfo(cameraId, token);
      setConnectMessage("เชื่อมต่อสำเร็จ");
      setCameraInfo(data?.data ?? null);
      try {
        setResultPreview(JSON.stringify(data, null, 2));
      } catch {
        setResultPreview(String(data));
      }
      // persist to session for connected page
      try {
        sessionStorage.setItem("Dashboard_cameraInfo", JSON.stringify(data?.data ?? null));
        sessionStorage.setItem("Dashboard_resultPreview", JSON.stringify(data ?? null));
      } catch {}

      router.push("/dashboard/connected");
    } catch (err: any) {
      setConnectMessage(err?.message || "เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="w-full min-h-[calc(100vh-2rem)] rounded-lg overflow-hidden shadow bg-white p-6">
      <div className="max-w-3xl mx-auto">
        <div className="w-full rounded-xl bg-white border border-gray-200 shadow p-5">
          <div className="space-y-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-800">Camera ID</label>
              <input
                type="text"
                placeholder="กรอก Camera ID"
                value={cameraId}
                onChange={(e) => setCameraId(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-800">Token</label>
              <input
                type="text"
                placeholder="กรอก Token"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!cameraId || !token || isConnecting}
                onClick={handleConnect}
              >
                {isConnecting ? "กำลังเชื่อมต่อ..." : "Connect"}
              </button>
              {connectMessage && (
                <span className="text-sm text-gray-700">{connectMessage}</span>
              )}
            </div>

            {cameraInfo && (
              <div className="rounded-lg border border-gray-200 p-4 bg-gray-50">
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
                    <div className="font-medium text-gray-900">{new Date(cameraInfo.created_at).toLocaleString()}</div>
                  </div>
                </div>
              </div>
            )}

            {resultPreview && (
              <pre className="mt-2 max-h-64 overflow-auto rounded-md bg-gray-50 border border-gray-200 p-3 text-xs text-gray-800">
{resultPreview}
              </pre>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}