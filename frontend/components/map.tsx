"use client";
import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import type { DetectionItem } from "@/app/type";

interface MapProps {
  latitude: number;
  longitude: number;
  detections: DetectionItem[];
}

export default function Map({ latitude, longitude, detections }: MapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const cameraMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const isMapInitialized = useRef(false);

  // Initialize map only once
  useEffect(() => {
    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";
    if (!mapContainer.current || isMapInitialized.current) return;

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v11",
      center: [longitude, latitude],
      zoom: 13,
    });

    mapRef.current = map;
    isMapInitialized.current = true;

    // Marker for the camera (only create once, no popup)
    const cameraMarker = new mapboxgl.Marker({ color: "red" })
      .setLngLat([longitude, latitude])
      .addTo(map);
    cameraMarkerRef.current = cameraMarker;

    return () => {
      // Cleanup all markers
      markersRef.current.forEach((marker) => marker.remove());
      if (cameraMarkerRef.current) {
        cameraMarkerRef.current.remove();
      }
      map.remove();
      mapRef.current = null;
      isMapInitialized.current = false;
    };
  }, []); // Only run once on mount

  // Update camera marker position when latitude/longitude change (without resetting viewport)
  useEffect(() => {
    if (cameraMarkerRef.current && mapRef.current) {
      cameraMarkerRef.current.setLngLat([longitude, latitude]);
    }
  }, [latitude, longitude]);

  // Update detection markers when detections change
  useEffect(() => {
    if (!mapRef.current) return;

    // Remove all old detection markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    // Find detection with latest timestamp
    if (detections.length === 0) return;
    
    const latestDetection = detections.reduce((latest, current) => {
      if (!latest) return current;
      if (!current) return latest;
      
      const latestTime = new Date(latest.timestamp).getTime();
      const currentTime = new Date(current.timestamp).getTime();
      
      return currentTime > latestTime ? current : latest;
    });
    
    if (!latestDetection || !latestDetection.objects) return;

    // Create new markers from the latest detection's objects
    latestDetection.objects.forEach((obj) => {
      const lat = typeof obj.lat === "string" ? parseFloat(obj.lat) : obj.lat;
      const lng = typeof obj.lng === "string" ? parseFloat(obj.lng) : obj.lng;

      if (!isNaN(lat) && !isNaN(lng)) {
        // Create marker with click interaction
        const marker = new mapboxgl.Marker({ color: "blue" })
          .setLngLat([lng, lat])
          .addTo(mapRef.current!);
        
        // Add click event to center map on marker
        const markerElement = marker.getElement();
        markerElement.style.cursor = "pointer";
        markerElement.addEventListener("click", () => {
          if (mapRef.current) {
            mapRef.current.flyTo({
              center: [lng, lat],
              zoom: 16,
              essential: true,
            });
          }
        });
        
        markersRef.current.push(marker);
      }
    });
  }, [detections]);

  return <div ref={mapContainer} className="w-full h-full" />;
}
