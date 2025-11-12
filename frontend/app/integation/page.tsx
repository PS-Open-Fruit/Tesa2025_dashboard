"use client";

import "mapbox-gl/dist/mapbox-gl.css";
import Map, { Marker, MapRef } from "react-map-gl/mapbox-legacy";
import { useRef, useState, useEffect } from "react";
import { io } from "socket.io-client";
import type { DetectionItem } from "@/app/type";

export default function IntegationPage() {
  const [viewportLeft, setViewportLeft] = useState({
    longitude: 101.1653,
    latitude: 14.3026,
    zoom: 12,
    bearing: 0,
    pitch: 0,
    padding: { top: 0, bottom: 0, left: 0, right: 0 },
  });
  
  const [viewportRight, setViewportRight] = useState({
    longitude: 101.1653,
    latitude: 14.3026,
    zoom: 12,
    bearing: 0,
    pitch: 0,
    padding: { top: 0, bottom: 0, left: 0, right: 0 },
  });
  
  const mapRefLeft = useRef<MapRef | null>(null);
  const mapRefRight = useRef<MapRef | null>(null);
  const socketRefLeft = useRef<ReturnType<typeof io> | null>(null);
  const socketRefRight = useRef<ReturnType<typeof io> | null>(null);
  
  const [isConnectedLeft, setIsConnectedLeft] = useState(false);
  const [isConnectedRight, setIsConnectedRight] = useState(false);
  
  const [selectedPlaceLeft, setSelectedPlaceLeft] = useState<{
    name: string;
    address: string;
    description: string;
    longitude: number;
    latitude: number;
  } | null>(null);
  
  const [selectedPlaceRight, setSelectedPlaceRight] = useState<{
    name: string;
    address: string;
    description: string;
    longitude: number;
    latitude: number;
  } | null>(null);

  const [samplePlaces] = useState(() => {
    const baseLng = 101.1653;
    const baseLat = 14.3026;
    const places = Array.from({ length: 6 }).map((_, i) => {
      const randLng = baseLng + (Math.random() - 0.5) * 0.08;
      const randLat = baseLat + (Math.random() - 0.5) * 0.08;
      return {
        name: `สถานที่ #${i + 1}`,
        address: "นครราชสีมา, ประเทศไทย",
        description: "ตัวอย่างสถานที่สำหรับแสดงรายละเอียดในแผงด้านขวา",
        longitude: randLng,
        latitude: randLat,
      };
    });
    // Ensure one canonical place near center
    places[0] = {
      name: "Tesa 2025 Venue",
      address: "Nakhon Ratchasima, Thailand",
      description: "Main conference location with exhibition halls and meeting rooms.",
      longitude: baseLng,
      latitude: baseLat,
    };
    return places;
  });

  // ✅ ฟังก์ชันสำหรับ connect/disconnect Socket.IO ฝั่งซ้าย (Offence)
  const toggleSocketLeft = () => {
    const offCamId = process.env.NEXT_PUBLIC_OFF_CAM;
    if (!offCamId) {
      console.warn("NEXT_PUBLIC_OFF_CAM is not set");
      return;
    }

    if (isConnectedLeft && socketRefLeft.current) {
      // Disconnect
      socketRefLeft.current.emit("unsubscribe_camera", { cam_id: offCamId });
      socketRefLeft.current.disconnect();
      socketRefLeft.current = null;
      setIsConnectedLeft(false);
      console.log("Disconnected Socket.IO Left (Offence)");
    } else {
      // Connect
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
      });

      socket.on("connect_error", (error: any) => {
        console.error("Socket.IO Left (Offence) connection error:", error);
        setIsConnectedLeft(false);
      });

      socket.on("disconnect", (reason: string) => {
        console.log("Socket.IO Left (Offence) disconnected:", reason);
        setIsConnectedLeft(false);
      });
    }
  };

  // ✅ ฟังก์ชันสำหรับ connect/disconnect Socket.IO ฝั่งขวา (Defence)
  const toggleSocketRight = () => {
    const defCamId = process.env.NEXT_PUBLIC_DEF_CAM;
    if (!defCamId) {
      console.warn("NEXT_PUBLIC_DEF_CAM is not set");
      return;
    }

    if (isConnectedRight && socketRefRight.current) {
      // Disconnect
      socketRefRight.current.emit("unsubscribe_camera", { cam_id: defCamId });
      socketRefRight.current.disconnect();
      socketRefRight.current = null;
      setIsConnectedRight(false);
      console.log("Disconnected Socket.IO Right (Defence)");
    } else {
      // Connect
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
      });

      socket.on("connect_error", (error: any) => {
        console.error("Socket.IO Right (Defence) connection error:", error);
        setIsConnectedRight(false);
      });

      socket.on("disconnect", (reason: string) => {
        console.log("Socket.IO Right (Defence) disconnected:", reason);
        setIsConnectedRight(false);
      });
    }
  };

  // Cleanup เมื่อ component unmount
  useEffect(() => {
    return () => {
      if (socketRefLeft.current) {
        socketRefLeft.current.disconnect();
        socketRefLeft.current = null;
      }
      if (socketRefRight.current) {
        socketRefRight.current.disconnect();
        socketRefRight.current = null;
      }
    };
  }, []);

  return (
    <div className="w-full h-[90vh] rounded-lg overflow-hidden shadow bg-white p-4">
      <div className="grid grid-cols-2 gap-4 h-full">
        {/* Left Map */}
        <div className="relative rounded-xl overflow-hidden shadow-md">
          {/* Title Card - Offence */}
          <div className="absolute top-4 left-4 right-4 z-10">
            <div className="bg-red-600 rounded-lg shadow-md px-4 py-2 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Offence</h2>
              <button
                onClick={toggleSocketLeft}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  isConnectedLeft
                    ? "bg-green-500 hover:bg-green-600 text-white"
                    : "bg-white hover:bg-gray-100 text-red-600"
                }`}
              >
                {isConnectedLeft ? "Connected" : "Disconnected"}
              </button>
            </div>
          </div>
          
          <Map
            ref={mapRefLeft}
            mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
            initialViewState={viewportLeft}
            onMove={(evt) => setViewportLeft(evt.viewState as any)}
            mapStyle="mapbox://styles/mapbox/streets-v12"
            style={{ width: "100%", height: "100%" }}
          >
            {samplePlaces.map((p, idx) => (
              <Marker
                key={`left-${p.name}-${idx}`}
                longitude={p.longitude}
                latitude={p.latitude}
                color="red"
                onClick={(e) => {
                  e.originalEvent.stopPropagation();
                  setSelectedPlaceLeft(p);
                  mapRefLeft.current?.flyTo({ 
                    center: [p.longitude, p.latitude], 
                    zoom: Math.max(viewportLeft.zoom, 14), 
                    essential: true 
                  });
                }}
              />
            ))}
          </Map>
          
          {/* Popup Card for Left Map */}
          {selectedPlaceLeft && (
            <div className="absolute bottom-4 left-4 right-4 z-10">
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{selectedPlaceLeft.name}</h3>
                    <p className="text-sm text-gray-600 mt-1">{selectedPlaceLeft.address}</p>
                  </div>
                  <button
                    className="inline-flex items-center justify-center rounded-md bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
                    onClick={() => setSelectedPlaceLeft(null)}
                  >
                    ปิด
                  </button>
                </div>
                <div className="h-px bg-gray-200 my-3" />
                <p className="text-sm text-gray-700 leading-relaxed">{selectedPlaceLeft.description}</p>
                <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-red-500"></span>
                    แผนที่ซ้าย
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Map */}
        <div className="relative rounded-xl overflow-hidden shadow-md">
          {/* Title Card - Defence */}
          <div className="absolute top-4 left-4 right-4 z-10">
            <div className="bg-blue-600 rounded-lg shadow-md px-4 py-2 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Defence</h2>
              <button
                onClick={toggleSocketRight}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  isConnectedRight
                    ? "bg-green-500 hover:bg-green-600 text-white"
                    : "bg-white hover:bg-gray-100 text-blue-600"
                }`}
              >
                {isConnectedRight ? "Connected" : "Disconnected"}
              </button>
            </div>
          </div>
          
          <Map
            ref={mapRefRight}
            mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
            initialViewState={viewportRight}
            onMove={(evt) => setViewportRight(evt.viewState as any)}
            mapStyle="mapbox://styles/mapbox/streets-v12"
            style={{ width: "100%", height: "100%" }}
          >
            {samplePlaces.map((p, idx) => (
              <Marker
                key={`right-${p.name}-${idx}`}
                longitude={p.longitude}
                latitude={p.latitude}
                color="blue"
                onClick={(e) => {
                  e.originalEvent.stopPropagation();
                  setSelectedPlaceRight(p);
                  mapRefRight.current?.flyTo({ 
                    center: [p.longitude, p.latitude], 
                    zoom: Math.max(viewportRight.zoom, 14), 
                    essential: true 
                  });
                }}
              />
            ))}
          </Map>
          
          {/* Popup Card for Right Map */}
          {selectedPlaceRight && (
            <div className="absolute bottom-4 left-4 right-4 z-10">
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{selectedPlaceRight.name}</h3>
                    <p className="text-sm text-gray-600 mt-1">{selectedPlaceRight.address}</p>
                  </div>
                  <button
                    className="inline-flex items-center justify-center rounded-md bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
                    onClick={() => setSelectedPlaceRight(null)}
                  >
                    ปิด
                  </button>
                </div>
                <div className="h-px bg-gray-200 my-3" />
                <p className="text-sm text-gray-700 leading-relaxed">{selectedPlaceRight.description}</p>
                <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    แผนที่ขวา
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
