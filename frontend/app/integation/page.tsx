"use client";

import "mapbox-gl/dist/mapbox-gl.css";
import Map, { Marker, MapRef } from "react-map-gl/mapbox-legacy";
import { useRef, useState } from "react";

export default function IntegationPage() {
  const [viewport, setViewport] = useState({
    longitude: 101.1653,
    latitude: 14.3026,
    zoom: 12,
    bearing: 0,
    pitch: 0,
    padding: { top: 0, bottom: 0, left: 0, right: 0 },
  });
  const [selectedPlace, setSelectedPlace] = useState<{
    name: string;
    address: string;
    description: string;
    longitude: number;
    latitude: number;
  } | null>(null);
  const mapRef = useRef<MapRef | null>(null);

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

  return (
    <div className="relative w-full h-[calc(100vh-2rem)] rounded-lg overflow-hidden shadow bg-white">
      <Map
        ref={mapRef}
        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
        initialViewState={viewport}
        onMove={(evt) => setViewport(evt.viewState as any)}
        onClick={() => setSelectedPlace(null)}
        mapStyle="mapbox://styles/mapbox/streets-v12"
        style={{ width: "100%", height: "100%" }}
      >
        {samplePlaces.map((p, idx) => (
          <Marker
            key={`${p.name}-${idx}`}
            longitude={p.longitude}
            latitude={p.latitude}
            onClick={(e) => {
              e.originalEvent.stopPropagation();
              setSelectedPlace(p);
              mapRef.current?.flyTo({ center: [p.longitude, p.latitude], zoom: Math.max(viewport.zoom, 13), essential: true });
            }}
          />
        ))}
      </Map>

      {selectedPlace && (
        <div className="absolute right-4 top-4 bottom-4 w-80 max-w-[22rem]">
          <div className="h-full overflow-y-auto rounded-xl bg-white shadow border border-gray-200 p-3 flex flex-col gap-3">
            <div className="px-1 pb-1">
              <h2 className="text-lg font-semibold text-gray-900">รายละเอียดสถานที่</h2>
              <p className="text-xs text-gray-500">แสดงเมื่อกดที่หมุดบนแผนที่</p>
            </div>
            <div className="w-full text-left rounded-lg border border-gray-200 bg-white">
              <div className="p-3 flex flex-col gap-2">
                <h3 className="text-base font-semibold text-gray-900">{selectedPlace.name}</h3>
                <p className="text-sm text-gray-600">{selectedPlace.address}</p>
                <div className="h-px bg-gray-200 my-1" />
                <p className="text-sm text-gray-700 leading-relaxed">{selectedPlace.description}</p>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    className="inline-flex items-center justify-center rounded-md bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200"
                    onClick={() => setSelectedPlace(null)}
                  >
                    ปิด
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
