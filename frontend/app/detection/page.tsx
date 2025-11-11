"use client";

import "mapbox-gl/dist/mapbox-gl.css";
import Map, { Marker } from "react-map-gl/mapbox-legacy";
import { useState } from "react";

export default function DetectionPage() {
  const [cameraId, setCameraId] = useState("");
  const [cameraToken, setCameraToken] = useState("");
  const [latitude, setLatitude] = useState(14.297569);
  const [longitude, setLongitude] = useState(101.166279);

  const [uploadInterval, setUploadInterval] = useState(6);
  const [minMovement, setMinMovement] = useState(8);
  const [maxMovement, setMaxMovement] = useState(10);
  const [numFrames, setNumFrames] = useState(3);

  const [isRunning, setIsRunning] = useState(false);

  return (
    <div className="w-full min-h-[calc(100vh-2rem)] rounded-lg overflow-hidden shadow bg-white p-4 sm:p-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: Settings */}
        <div className="rounded-xl bg-white border border-gray-200 shadow p-4 sm:p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-3">การตั้งค่า</h2>

          <div className="grid grid-cols-1 gap-3">
            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-800">Camera ID</label>
              <input
                type="text"
                placeholder="Camera ID"
                value={cameraId}
                onChange={(e) => setCameraId(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-800">Camera Token</label>
              <input
                type="text"
                placeholder="Camera Token"
                value={cameraToken}
                onChange={(e) => setCameraToken(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-800">Latitude</label>
                <input
                  type="number"
                  step="0.000001"
                  value={latitude}
                  onChange={(e) => setLatitude(parseFloat(e.target.value))}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-800">Longitude</label>
                <input
                  type="number"
                  step="0.000001"
                  value={longitude}
                  onChange={(e) => setLongitude(parseFloat(e.target.value))}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="h-64 w-full rounded-md overflow-hidden border border-gray-200">
              <Map
                mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
                initialViewState={{ longitude, latitude, zoom: 14 }}
                onMove={(e) => {
                  const vs: any = e.viewState;
                  setLongitude(vs.longitude);
                  setLatitude(vs.latitude);
                }}
                mapStyle="mapbox://styles/mapbox/satellite-streets-v12"
                style={{ width: "100%", height: "100%" }}
              >
                <Marker longitude={longitude} latitude={latitude} />
              </Map>
            </div>

            <div className="pt-2 space-y-5">
              <div>
                <div className="text-sm text-gray-800 mb-1">ช่วงเวลาการอัปโหลด (วินาที): {uploadInterval}</div>
                <input
                  type="range"
                  min={1}
                  max={60}
                  value={uploadInterval}
                  onChange={(e) => setUploadInterval(parseInt(e.target.value))}
                  className="w-full"
                />
              </div>

              <div>
                <div className="text-sm text-gray-800 mb-1">การเคลื่อนที่ขั้นต่ำ (เมตร): {minMovement}</div>
                <input
                  type="range"
                  min={1}
                  max={100}
                  value={minMovement}
                  onChange={(e) => setMinMovement(parseInt(e.target.value))}
                  className="w-full"
                />
              </div>

              <div>
                <div className="text-sm text-gray-800 mb-1">การเคลื่อนที่สูงสุด (เมตร): {maxMovement}</div>
                <input
                  type="range"
                  min={1}
                  max={100}
                  value={maxMovement}
                  onChange={(e) => setMaxMovement(parseInt(e.target.value))}
                  className="w-full"
                />
              </div>

              <div>
                <div className="text-sm text-gray-800 mb-1">จำนวนเฟรม: {numFrames}</div>
                <input
                  type="range"
                  min={1}
                  max={20}
                  value={numFrames}
                  onChange={(e) => setNumFrames(parseInt(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right: Upload & Control */}
        <div className="rounded-xl bg-white border border-gray-200 shadow p-4 sm:p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-3">อัปโหลดรูปภาพ</h2>
          <label className="block border border-dashed border-gray-300 rounded-md p-6 text-center text-sm text-gray-600 cursor-pointer hover:bg-gray-50">
            <input type="file" className="hidden" multiple accept="image/*" />
            เลือกรูปภาพ (หลายไฟล์)
          </label>

          <div className="h-px bg-gray-200 my-4" />

          <h3 className="text-base font-semibold text-gray-900 mb-2">การควบคุม</h3>
          <div className="flex items-center justify-between">
            <button
              className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => setIsRunning((v) => !v)}
            >
              {isRunning ? "หยุด" : "เริ่มการทดลอง"}
            </button>

            <div className="flex items-center gap-2">
              <span
                className={
                  "inline-block h-3 w-3 rounded-full " + (isRunning ? "bg-green-500" : "bg-gray-400")
                }
              />
              <span className="text-sm text-gray-800">สถานะ: {isRunning ? "กำลังทำงาน" : "หยุด"}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
 