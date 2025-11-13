"use client";
import { useEffect, useRef, useCallback } from "react";
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
  latitude?: number;
  longitude?: number;
  detections?: DetectionItem[];
  onMarkerClick?: (object: DetectionObject & { isLost?: boolean; isNew?: boolean; team?: string }) => void;
  onRemoveDrone?: (objId: string) => void;
  teamColors?: { [camId: string]: string }; // Map camera IDs to colors
}

export default function Map({ latitude = 14.3026, longitude = 101.1653, detections = [], onMarkerClick, teamColors }: MapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const isMapInitialized = useRef(false);

  // Get color for a detection based on camera ID
  const getMarkerColor = useCallback((camId: string) => {
    if (teamColors && camId && teamColors[camId]) {
      return teamColors[camId];
    }
    return "#3b82f6"; // Default blue
  }, [teamColors]);

  // Initialize map only once
  useEffect(() => {
    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";
    if (!mapContainer.current || isMapInitialized.current) return;

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v11",
      center: [longitude ?? 101.1653, latitude ?? 14.3026],
      zoom: 12,
    });

    mapRef.current = map;
    isMapInitialized.current = true;

    return () => {
      // Cleanup all markers
      markersRef.current.forEach((marker) => marker.remove());
      if (map) {
        map.remove();
      }
      mapRef.current = null;
      isMapInitialized.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only initialize once on mount

  // Update markers when detections change
  useEffect(() => {
    if (!mapRef.current || !mapRef.current.loaded()) return;

    // Clear all existing markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    if (!detections || detections.length === 0) return;

    // Collect all unique objects from all detections with their camera IDs
    const objectsMap = new globalThis.Map<string, { obj: DetectionObject; camId: string; timestamp: string }>();

    // Process detections from newest to oldest to get latest position
    const sortedDetections = [...detections].sort((a, b) => {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

    sortedDetections.forEach((detection) => {
      if (detection.objects && detection.cam_id) {
        detection.objects.forEach((obj) => {
          if (obj.obj_id && !objectsMap.has(obj.obj_id)) {
            objectsMap.set(obj.obj_id, {
              obj,
              camId: detection.cam_id,
              timestamp: detection.timestamp
            });
          }
        });
      }
    });

    // Create markers for all unique objects
    objectsMap.forEach(({ obj, camId }) => {
      const lat = typeof obj.lat === "string" ? parseFloat(obj.lat) : obj.lat;
      const lng = typeof obj.lng === "string" ? parseFloat(obj.lng) : obj.lng;

      if (isNaN(lat) || isNaN(lng)) return;

      // Get color based on camera ID
      const markerColor = getMarkerColor(camId);

      // Create marker with team color
      const droneIcon = createDroneIcon(markerColor);
      const marker = new mapboxgl.Marker({
        element: droneIcon,
        anchor: "center"
      })
        .setLngLat([lng, lat])
        .addTo(mapRef.current!);

      // Add click event
      marker.getElement().addEventListener("click", () => {
        if (mapRef.current) {
          mapRef.current.flyTo({
            center: [lng, lat],
            zoom: 16,
            essential: true,
          });
        }
        if (onMarkerClick) {
          onMarkerClick({ ...obj, isLost: false, isNew: false, team: camId });
        }
      });

      markersRef.current.push(marker);
    });

    // Auto-fit bounds to show all markers
    if (markersRef.current.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();

      markersRef.current.forEach((marker) => {
        bounds.extend(marker.getLngLat());
      });

      mapRef.current.fitBounds(bounds, {
        padding: { top: 100, bottom: 100, left: 100, right: 100 },
        maxZoom: 15,
        duration: 1000
      });
    }
  }, [detections, getMarkerColor, onMarkerClick]);

  return <div ref={mapContainer} className="w-full h-full" />;
}
