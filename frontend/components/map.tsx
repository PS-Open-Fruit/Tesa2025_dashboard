"use client";
import { useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import mapboxgl from "mapbox-gl";
import { TbDrone } from "react-icons/tb";
import type { DetectionItem, DetectionObject } from "@/app/type";

// Create custom drone icon element using react-icons
const createDroneIcon = (color: string = "#3b82f6") => {
  const el = document.createElement("div");
  el.className = "drone-marker";
  el.style.width = "32px";
  el.style.height = "32px";
  el.style.cursor = "pointer";
  el.style.display = "flex";
  el.style.alignItems = "center";
  el.style.justifyContent = "center";
  
  // Render React icon component into the element
  const root = createRoot(el);
  root.render(<TbDrone size={32} color={color} />);
  
  return el;
};

interface MapProps {
  latitude: number;
  longitude: number;
  detections: DetectionItem[];
  onMarkerClick?: (object: DetectionObject) => void;
}

export default function Map({ latitude, longitude, detections, onMarkerClick }: MapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const isMapInitialized = useRef(false);
  const onMarkerClickRef = useRef(onMarkerClick);

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

    return () => {
      // Cleanup all markers
      markersRef.current.forEach((marker) => marker.remove());
      map.remove();
      mapRef.current = null;
      isMapInitialized.current = false;
    };
  }, []); // Only run once on mount

  // Keep onMarkerClick ref up to date
  useEffect(() => {
    onMarkerClickRef.current = onMarkerClick;
  }, [onMarkerClick]);

  // Update detection markers when detections change
  useEffect(() => {
    if (!mapRef.current) return;

    // Wait for map to be fully loaded before creating markers
    const createMarkers = () => {
      if (!mapRef.current || !mapRef.current.loaded()) return;

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
          // Create marker with click interaction - using drone icon
          const droneIcon = createDroneIcon("#3b82f6"); // blue color
          const marker = new mapboxgl.Marker({ 
            element: droneIcon,
            anchor: "center" // Anchor marker at center point
          })
            .setLngLat([lng, lat])
            .addTo(mapRef.current!);
          
          // Add click event to center map on marker and trigger callback
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
            // Trigger callback with marker object data
            if (onMarkerClickRef.current) {
              onMarkerClickRef.current(obj);
            }
          });
          
          markersRef.current.push(marker);
        }
      });
    };

    // Check if map is loaded, if not wait for load event
    if (mapRef.current.loaded()) {
      createMarkers();
    } else {
      mapRef.current.once("load", createMarkers);
    }
  }, [detections]);

  return <div ref={mapContainer} className="w-full h-full" />;
}
