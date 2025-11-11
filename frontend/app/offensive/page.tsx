"use client";

import { useState } from "react";

export default function OffensivePage() {
  const [cameraId, setCameraId] = useState("");
  const [token, setToken] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectMessage, setConnectMessage] = useState<string | null>(null);
  const [resultPreview, setResultPreview] = useState<string | null>(null);

  const handleConnect = async () => {
    setIsConnecting(true);
    setConnectMessage(null);
    setResultPreview(null);
    try {
      const base = process.env.NEXT_PUBLIC_OFFENSIVE_BASE;
      if (!base) {
        throw new Error("กรุณาตั้งค่า NEXT_PUBLIC_OFFENSIVE_BASE ใน env");
      }
      const url = `${base.replace(/\/$/, "")}/camera/info?cameraId=${encodeURIComponent(
        cameraId)}`;

      const res = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "x-camera-id": encodeURIComponent(token),
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Connect failed");
      setConnectMessage("เชื่อมต่อสำเร็จ");
      try {
        setResultPreview(JSON.stringify(data, null, 2));
      } catch {
        setResultPreview(String(data));
      }
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

