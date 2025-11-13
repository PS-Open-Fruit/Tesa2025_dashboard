"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { fetchCameraInfo } from "../api";
import { Icon } from "@iconify/react";

export default function DefensePage() {
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
      router.push("/defense/connected");
    } catch (err: any) {
      setConnectMessage(err?.message || "เกิดข้อผิดพลาดในการเชื่อมต่อ");
      setIsConnecting(false);
    }
  };

  // ✅ ปุ่ม connect (กรอกเอง)
  const handleConnect = async () => {
    await connectToCamera(cameraId, token);
  };

  // ✅ ปุ่ม defensive camera
  const handleDefensiveConnect = async () => {
    const envCamId = process.env.NEXT_PUBLIC_DEF_CAM || "";
    const envToken = process.env.NEXT_PUBLIC_DEF_TOKEN || "";

    if (!envCamId || !envToken) {
      setConnectMessage("⚠️ ไม่พบค่าใน .env (NEXT_PUBLIC_DEF_CAM / NEXT_PUBLIC_DEF_TOKEN)");
      return;
    }

    await connectToCamera(envCamId, envToken);
  };

  return (
    <div className="w-full min-h-[calc(100vh-10rem)] flex items-center justify-center p-6">
      <div className="max-w-2xl w-full">
        {/* Header Card */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg mb-4">
            <Icon icon="mdi:shield" width="48" height="48" className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Defense Dashboard</h1>
          <p className="text-slate-400">Connect to your defense camera system</p>
        </div>

        {/* Connection Card */}
        <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl p-8">
          <div className="space-y-6">
            {/* Input Fields */}
            <div className="space-y-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                  <Icon icon="mdi:camera" width="18" height="18" className="text-blue-400" />
                  Camera ID
                </label>
                <input
                  type="text"
                  placeholder="Enter Camera ID"
                  value={cameraId}
                  onChange={(e) => setCameraId(e.target.value)}
                  className="w-full rounded-lg border border-slate-600 bg-slate-700 px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                  <Icon icon="mdi:key" width="18" height="18" className="text-blue-400" />
                  Access Token
                </label>
                <input
                  type="password"
                  placeholder="Enter Access Token"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="w-full rounded-lg border border-slate-600 bg-slate-700 px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Buttons */}
            <div className="space-y-3 pt-2">
              <button
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 px-6 py-3 text-base font-semibold text-white hover:from-blue-700 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                disabled={!cameraId || !token || isConnecting}
                onClick={handleConnect}
              >
                {isConnecting ? (
                  <>
                    <Icon icon="mdi:loading" width="20" height="20" className="animate-spin" />
                    <span>Connecting...</span>
                  </>
                ) : (
                  <>
                    <Icon icon="mdi:lan-connect" width="20" height="20" />
                    <span>Connect Manual</span>
                  </>
                )}
              </button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-600"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-slate-800 text-slate-400">OR</span>
                </div>
              </div>

              <button
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-slate-700 border-2 border-blue-500/50 px-6 py-3 text-base font-semibold text-white hover:bg-slate-600 hover:border-blue-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                disabled={isConnecting}
                onClick={handleDefensiveConnect}
                title="Quick connect to pre-configured defense camera"
              >
                {isConnecting ? (
                  <>
                    <Icon icon="mdi:loading" width="20" height="20" className="animate-spin" />
                    <span>Connecting...</span>
                  </>
                ) : (
                  <>
                    <Icon icon="mdi:shield-check" width="20" height="20" className="text-blue-400" />
                    <span>Defense Camera (Quick Connect)</span>
                  </>
                )}
              </button>
            </div>

            {/* Status Message */}
            {connectMessage && (
              <div className={`p-4 rounded-lg ${
                connectMessage.includes("ผิดพลาด") || connectMessage.includes("ไม่พบ")
                  ? "bg-red-500/10 border border-red-500/50"
                  : "bg-blue-500/10 border border-blue-500/50"
              }`}>
                <div className="flex items-start gap-3">
                  <Icon 
                    icon={connectMessage.includes("ผิดพลาด") || connectMessage.includes("ไม่พบ") ? "mdi:alert-circle" : "mdi:information"} 
                    width="20" 
                    height="20" 
                    className={connectMessage.includes("ผิดพลาด") || connectMessage.includes("ไม่พบ") ? "text-red-400 mt-0.5" : "text-blue-400 mt-0.5"}
                  />
                  <p className="text-sm text-slate-200">{connectMessage}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Info Footer */}
        <div className="mt-6 text-center">
          <p className="text-xs text-slate-500">
            <Icon icon="mdi:shield-lock" className="inline mr-1" />
            Secure connection established via HTTPS
          </p>
        </div>
      </div>
    </div>
  );
}
