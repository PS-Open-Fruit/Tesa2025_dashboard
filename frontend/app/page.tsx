"use client";

import "mapbox-gl/dist/mapbox-gl.css";
import Map, { Marker } from "react-map-gl/mapbox-legacy";
import { useState } from "react";

export default function HomePage() {
  const [viewport, setViewport] = useState({
    longitude: 100.5018,
    latitude: 13.7563,
    zoom: 10,
  });

  return (
    <div className="w-full h-[calc(100vh-2rem)] rounded-lg overflow-hidden shadow bg-white">
      <Map
        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
        initialViewState={viewport}
        mapStyle="mapbox://styles/mapbox/streets-v12"
        style={{ width: "100%", height: "100%" }}
      >
        <Marker longitude={100.5018} latitude={13.7563} />
      </Map>
    </div>
  );
}
