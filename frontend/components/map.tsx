"use client";
import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";

interface MapProps {
  latitude: number;
  longitude: number;
  detections: any[];
}

export default function Map({ latitude, longitude, detections }: MapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";
    if (!mapContainer.current) return;

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v11",
      center: [longitude, latitude],
      zoom: 13,
    });

    // Marker for the camera
    new mapboxgl.Marker({ color: "red" })
      .setLngLat([longitude, latitude])
      .setPopup(new mapboxgl.Popup().setText("Camera Location"))
      .addTo(map);

    // Marker for detections (if have location)
    detections.forEach((d) => {
      if (d.longitude && d.latitude) {
        new mapboxgl.Marker({ color: "blue" })
          .setLngLat([d.longitude, d.latitude])
          .setPopup(new mapboxgl.Popup().setText(`${d.type}`))
          .addTo(map);
      }
    });

    return () => map.remove();
  }, [latitude, longitude, detections]);

  return <div ref={mapContainer} className="w-full h-full" />;
}
