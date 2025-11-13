"use client";
import { useEffect, useRef, useCallback, useState } from "react";
import { createRoot } from "react-dom/client";
import mapboxgl from "mapbox-gl";
import { TbDrone } from "react-icons/tb";
import { Icon } from "@iconify/react";
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
  onRecenterChange?: (isManual: boolean) => void; // Callback when manual mode changes
}

export default function Map({ latitude = 14.3026, longitude = 101.1653, detections = [], onMarkerClick, teamColors, onRecenterChange }: MapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const routeLayersRef = useRef<Set<string>>(new Set());
  const isMapInitialized = useRef(false);
  
  const [mapStyle, setMapStyle] = useState<"streets" | "satellite">("streets");
  const [isStyleLoaded, setIsStyleLoaded] = useState(false);
  const [isManualMode, setIsManualMode] = useState(false);

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

    map.on('load', () => {
      setIsStyleLoaded(true);
    });

    // Detect user interactions (zoom, pan) and switch to manual mode
    const handleUserInteraction = () => {
      if (!isManualMode) {
        setIsManualMode(true);
        if (onRecenterChange) {
          onRecenterChange(true);
        }
      }
    };

    map.on('zoomstart', (e: any) => {
      // Only switch to manual if not triggered programmatically
      if (e.originalEvent) {
        handleUserInteraction();
      }
    });

    map.on('dragstart', handleUserInteraction);

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

  // Change map style when toggled
  useEffect(() => {
    if (!mapRef.current) return;
    
    const styleUrl = mapStyle === "satellite" 
      ? "mapbox://styles/mapbox/satellite-streets-v12"
      : "mapbox://styles/mapbox/streets-v11";
    
    setIsStyleLoaded(false);
    mapRef.current.setStyle(styleUrl);
  }, [mapStyle]);

  // Listen for style load events
  useEffect(() => {
    if (!mapRef.current) return;

    const handleStyleLoad = () => {
      setIsStyleLoaded(true);
    };

    mapRef.current.on('style.load', handleStyleLoad);

    return () => {
      if (mapRef.current) {
        mapRef.current.off('style.load', handleStyleLoad);
      }
    };
  }, []);

  // Update markers and routes when detections or map style change
  useEffect(() => {
    if (!mapRef.current || !isStyleLoaded) return;
    
    console.log('Updating markers, detections count:', detections.length);

    // Clear all existing markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    // Clear all route layers
    routeLayersRef.current.forEach((layerId) => {
      if (mapRef.current!.getLayer(layerId)) {
        mapRef.current!.removeLayer(layerId);
      }
      if (mapRef.current!.getSource(layerId)) {
        mapRef.current!.removeSource(layerId);
      }
    });
    routeLayersRef.current.clear();

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

    // Create route paths for each drone
    objectsMap.forEach(({ obj, camId }) => {
      // Find all positions for this object from all detections
      const positions: Array<{ lng: number; lat: number }> = [];

      sortedDetections.forEach((detection) => {
        if (detection.objects && detection.cam_id === camId) {
          const foundObj = detection.objects.find(o => o.obj_id === obj.obj_id);
          if (foundObj) {
            const lat = typeof foundObj.lat === "string" ? parseFloat(foundObj.lat) : foundObj.lat;
            const lng = typeof foundObj.lng === "string" ? parseFloat(foundObj.lng) : foundObj.lng;
            if (!isNaN(lat) && !isNaN(lng)) {
              positions.push({ lng, lat });
            }
          }
        }
      });

      // Draw route if we have at least 2 positions
      if (positions.length >= 2) {
        const routeId = `route-${obj.obj_id}`;
        const coordinates = positions.map(pos => [pos.lng, pos.lat]);
        const routeColor = getMarkerColor(camId);

        mapRef.current!.addSource(routeId, {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: coordinates
            }
          }
        });

        mapRef.current!.addLayer({
          id: routeId,
          type: 'line',
          source: routeId,
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': routeColor,
            'line-width': 3,
            'line-opacity': 0.7
          }
        });

        routeLayersRef.current.add(routeId);
      }
    });

    // Auto-fit bounds to show all markers (only if not in manual mode)
    if (markersRef.current.length > 0 && !isManualMode) {
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
  }, [detections, getMarkerColor, onMarkerClick, isStyleLoaded, isManualMode]);

  // Function to refocus on latest drone positions and return to auto mode
  const handleRecenter = useCallback(() => {
    if (!mapRef.current || !detections || detections.length === 0) return;

    // Get latest position for each unique drone
    const latestPositions = new globalThis.Map<string, { lat: number; lng: number }>();
    
    // Sort detections by timestamp (newest first)
    const sortedDetections = [...detections].sort((a, b) => {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

    // Get the latest position for each drone
    sortedDetections.forEach((detection) => {
      if (detection.objects) {
        detection.objects.forEach((obj) => {
          if (obj.obj_id && !latestPositions.has(obj.obj_id)) {
            const lat = typeof obj.lat === "string" ? parseFloat(obj.lat) : obj.lat;
            const lng = typeof obj.lng === "string" ? parseFloat(obj.lng) : obj.lng;
            if (!isNaN(lat) && !isNaN(lng)) {
              latestPositions.set(obj.obj_id, { lat, lng });
            }
          }
        });
      }
    });

    if (latestPositions.size === 0) return;

    // Create bounds from latest positions
    const bounds = new mapboxgl.LngLatBounds();
    latestPositions.forEach(({ lat, lng }) => {
      bounds.extend([lng, lat]);
    });

    mapRef.current.fitBounds(bounds, {
      padding: { top: 100, bottom: 100, left: 100, right: 100 },
      maxZoom: 15,
      duration: 1000
    });

    setIsManualMode(false);
    if (onRecenterChange) {
      onRecenterChange(false);
    }
  }, [detections, onRecenterChange]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full" />
      
      {/* Satellite Toggle Button */}
      <button
        onClick={() => setMapStyle(prev => prev === "streets" ? "satellite" : "streets")}
        className="absolute top-4 left-4 z-10 bg-slate-800/95 backdrop-blur-md rounded-lg px-4 py-2 border border-slate-700 hover:bg-slate-700 transition-all shadow-lg flex items-center gap-2"
        title={mapStyle === "streets" ? "Switch to Satellite" : "Switch to Streets"}
      >
        <Icon 
          icon={mapStyle === "streets" ? "mdi:satellite-variant" : "mdi:map"} 
          width="20" 
          height="20" 
          className="text-slate-300"
        />
        <span className="text-sm text-white font-medium">
          {mapStyle === "streets" ? "Satellite" : "Streets"}
        </span>
      </button>

      {/* Refocus Button - Shows when in manual mode */}
      {isManualMode && (
        <button
          onClick={handleRecenter}
          className="absolute top-4 left-40 z-10 bg-purple-600/95 backdrop-blur-md rounded-lg px-4 py-2 border border-purple-500 hover:bg-purple-700 transition-all shadow-lg flex items-center gap-2 animate-slideDown"
          title="Refocus on latest drone positions and auto-follow"
        >
          <Icon 
            icon="mdi:target" 
            width="20" 
            height="20" 
            className="text-white"
          />
          <span className="text-sm text-white font-medium">
            Refocus
          </span>
        </button>
      )}
    </div>
  );
}
