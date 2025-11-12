"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { fetchCameraInfo } from "../api";

export default function OffensePage() {
  const [cameraId, setCameraId] = useState("");
  const [token, setToken] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectMessage, setConnectMessage] = useState<string | null>(null);
  const router = useRouter();

  // ✅ ฟังก์ชันหลัก ใช้เชื่อมต่อกับกล้อง
  const connectToCamera = async (camId: string, camToken: string) => {
    setIsConnecting(true);
    setConnectMessage(null);

    try {
      const data = await fetchCameraInfo(camId, camToken);

      if (!data?.data) throw new Error("ไม่พบข้อมูลกล้อง");

      // ✅ บันทึกลง sessionStorage
      sessionStorage.setItem("Dashboard_cameraInfo", JSON.stringify(data.data));
      sessionStorage.setItem("Dashboard_resultPreview", JSON.stringify(data));

      // ✅ ไปหน้า connected
      router.push("/offense/connected");
    } catch (err: any) {
      setConnectMessage(err?.message || "เกิดข้อผิดพลาดในการเชื่อมต่อ");
      setIsConnecting(false);
    }
  };

  // ✅ ปุ่ม connect (กรอกเอง)
  const handleConnect = async () => {
    await connectToCamera(cameraId, token);
  };

  // ✅ ปุ่ม offence camera
  const handleOffenceConnect = async () => {
    const envCamId = process.env.NEXT_PUBLIC_OFF_CAM || "";
    const envToken = process.env.NEXT_PUBLIC_OFF_TOKEN || "";

    if (!envCamId || !envToken) {
      setConnectMessage("⚠️ ไม่พบค่าใน .env (NEXT_PUBLIC_OFF_CAM / NEXT_PUBLIC_OFF_TOKEN)");
      return;
    }

    await connectToCamera(envCamId, envToken);
  };

  return (
    <div className="w-full min-h-[calc(100vh-2rem)] rounded-lg overflow-hidden shadow bg-white p-6">
      <div className="max-w-3xl mx-auto">
        <div className="w-full rounded-xl bg-white border border-gray-200 shadow p-5">
          <div className="space-y-4">
            {/* Input Fields */}
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-800">Camera ID</label>
              <input
                type="text"
                placeholder="กรอก Camera ID"
                value={cameraId}
                onChange={(e) => setCameraId(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-800">Token</label>
              <input
                type="text"
                placeholder="กรอก Token"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            {/* Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-3">
              {/* Manual Connect */}
              <button
                className="inline-flex items-center justify-center rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!cameraId || !token || isConnecting}
                onClick={handleConnect}
              >
                {isConnecting ? "กำลังเชื่อมต่อ..." : "Connect"}
              </button>

              {/* Offence Camera */}
              <button
                className="inline-flex items-center justify-center rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isConnecting}
                onClick={handleOffenceConnect}
                title="เชื่อมต่อกล้อง Offense จาก environment"
              >
                {isConnecting ? "กำลังเชื่อมต่อ..." : "Offense Camera"}
              </button>

              {connectMessage && (
                <span
                  className={`text-sm ${
                    connectMessage.includes("ผิดพลาด") || connectMessage.includes("ไม่พบ")
                      ? "text-red-600"
                      : "text-gray-700"
                  }`}
                >
                  {connectMessage}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

