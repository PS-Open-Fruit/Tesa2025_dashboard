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
  onMarkerClick?: (object: DetectionObject & { isLost?: boolean; isNew?: boolean; team?: string }) => void;
  onRemoveDrone?: (objId: string) => void;
  teamColors?: { [camId: string]: string }; // Map camera IDs to colors
}

export default function Map({ latitude, longitude, detections, onMarkerClick, onRemoveDrone, teamColors }: MapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const routesRef = useRef<{ [objId: string]: any }>({});
  const previousObjectsRef = useRef<Set<string>>(new Set());
  const isMapInitialized = useRef(false);
  const onMarkerClickRef = useRef(onMarkerClick);
  const onRemoveDroneRef = useRef(onRemoveDrone);

  // Get color for a detection based on camera ID
  const getMarkerColor = (detection: DetectionItem, isLost: boolean = false) => {
    if (isLost) return "#ef4444"; // Red for lost
    if (teamColors && detection.cam_id && teamColors[detection.cam_id]) {
      return teamColors[detection.cam_id];
    }
    return "#3b82f6"; // Default blue
  };

  // Initialize map only once
  useEffect(() => {
    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";
    if (!mapContainer.current || isMapInitialized.current) return;

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v11",
      center: [longitude, latitude],
      zoom: 12,
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

  // Keep callbacks ref up to date
  useEffect(() => {
    onMarkerClickRef.current = onMarkerClick;
    onRemoveDroneRef.current = onRemoveDrone;
  }, [onMarkerClick, onRemoveDrone]);

  // Update detection markers when detections change
  useEffect(() => {
    if (!mapRef.current) return;

    // Wait for map to be fully loaded before creating markers
    const createMarkers = () => {
      if (!mapRef.current || !mapRef.current.loaded()) return;

      // Remove all old detection markers and routes
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      
      // Remove old route layers and sources
      Object.keys(routesRef.current).forEach((objId) => {
        const map = mapRef.current!;
        if (map.getLayer(`route-${objId}`)) {
          map.removeLayer(`route-${objId}`);
        }
        if (map.getSource(`route-${objId}`)) {
          map.removeSource(`route-${objId}`);
        }
      });
      routesRef.current = {};

      if (detections.length === 0) {
        previousObjectsRef.current = new Set();
        return;
      }

      // Sort detections by timestamp (oldest to newest)
      const sortedDetections = [...detections].sort((a, b) => {
        const timeA = new Date(a.timestamp).getTime();
        const timeB = new Date(b.timestamp).getTime();
        return timeA - timeB;
      });

      // Get latest detection
      const latestDetection = sortedDetections[sortedDetections.length - 1];
      if (!latestDetection || !latestDetection.objects) {
        previousObjectsRef.current = new Set();
        return;
      }

      // Get current object IDs
      const currentObjectIds = new Set(
        latestDetection.objects.map(obj => obj.obj_id).filter(Boolean)
      );

      // Find lost objects (were in previous, not in current)
      const lostObjects = Array.from(previousObjectsRef.current).filter(
        id => !currentObjectIds.has(id)
      );

      // Find new objects (not in previous, in current)
      const newObjects = Array.from(currentObjectIds).filter(
        id => !previousObjectsRef.current.has(id)
      );

      // Create markers for current objects
      latestDetection.objects.forEach((obj) => {
        const lat = typeof obj.lat === "string" ? parseFloat(obj.lat) : obj.lat;
        const lng = typeof obj.lng === "string" ? parseFloat(obj.lng) : obj.lng;

        if (!isNaN(lat) && !isNaN(lng) && obj.obj_id) {
          const isNew = newObjects.includes(obj.obj_id);
          const isLost = false; // Current objects are not lost
          
          // Get color based on camera ID (team)
          const markerColor = getMarkerColor(latestDetection, isLost);
          
          // Create marker with appropriate color
          const droneIcon = createDroneIcon(markerColor);
          const marker = new mapboxgl.Marker({ 
            element: droneIcon,
            anchor: "center"
          })
            .setLngLat([lng, lat])
            .addTo(mapRef.current!);
          
          // Add click event
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
            if (onMarkerClickRef.current) {
              onMarkerClickRef.current({ ...obj, isLost, isNew, team: latestDetection.cam_id });
            }
          });
          
          markersRef.current.push(marker);

          // Create route for non-new objects (only if not new)
          if (!isNew) {
            // Find all positions for this object (up to 5 most recent)
            const objectPositions: Array<{ lat: number; lng: number }> = [];
            
            // Go through detections from newest to oldest
            for (let i = sortedDetections.length - 1; i >= 0 && objectPositions.length < 6; i--) {
              const detection = sortedDetections[i];
              if (detection.objects) {
                const foundObj = detection.objects.find(o => o.obj_id === obj.obj_id);
                if (foundObj) {
                  const objLat = typeof foundObj.lat === "string" ? parseFloat(foundObj.lat) : foundObj.lat;
                  const objLng = typeof foundObj.lng === "string" ? parseFloat(foundObj.lng) : foundObj.lng;
                  if (!isNaN(objLat) && !isNaN(objLng)) {
                    objectPositions.unshift({ lat: objLat, lng: objLng }); // Add to beginning
                  }
                }
              }
            }

            // Create route if we have at least 2 positions
            if (objectPositions.length >= 2 && mapRef.current) {
              const coordinates = objectPositions.map(pos => [pos.lng, pos.lat]);
              
              const routeId = `route-${obj.obj_id}`;
              const sourceId = `route-${obj.obj_id}`;
              
              if (!mapRef.current.getSource(sourceId)) {
                mapRef.current.addSource(sourceId, {
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

                mapRef.current.addLayer({
                  id: routeId,
                  type: 'line',
                  source: sourceId,
                  layout: {
                    'line-join': 'round',
                    'line-cap': 'round'
                  },
                  paint: {
                    'line-color': '#3b82f6',
                    'line-width': 2,
                    'line-opacity': 0.6
                  }
                });

                routesRef.current[obj.obj_id] = { sourceId, layerId: routeId };
              } else {
                // Update existing source
                const source = mapRef.current.getSource(sourceId) as mapboxgl.GeoJSONSource;
                if (source) {
                  source.setData({
                    type: 'Feature',
                    properties: {},
                    geometry: {
                      type: 'LineString',
                      coordinates: coordinates
                    }
                  });
                }
              }
            }
          }
        }
      });

      // Create markers for lost objects (from previous detection)
      if (lostObjects.length > 0 && sortedDetections.length > 1) {
        const previousDetection = sortedDetections[sortedDetections.length - 2];
        if (previousDetection && previousDetection.objects) {
          lostObjects.forEach((objId) => {
            const lostObj = previousDetection.objects!.find(o => o.obj_id === objId);
            if (lostObj) {
              const lat = typeof lostObj.lat === "string" ? parseFloat(lostObj.lat) : lostObj.lat;
              const lng = typeof lostObj.lng === "string" ? parseFloat(lostObj.lng) : lostObj.lng;

              if (!isNaN(lat) && !isNaN(lng)) {
                // Create red marker for lost object
                const droneIcon = createDroneIcon("#ef4444"); // red color
                const marker = new mapboxgl.Marker({ 
                  element: droneIcon,
                  anchor: "center"
                })
                  .setLngLat([lng, lat])
                  .addTo(mapRef.current!);
                
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
                  if (onMarkerClickRef.current) {
                    onMarkerClickRef.current({ ...lostObj, isLost: true, isNew: false });
                  }
                });
                
                markersRef.current.push(marker);
              }
            }
          });
        }
      }

      // Update previous objects for next comparison
      previousObjectsRef.current = currentObjectIds;

      // Auto-fit bounds to show all markers
      if (markersRef.current.length > 0 && mapRef.current) {
        const bounds = new mapboxgl.LngLatBounds();
        
        // Add all marker positions to bounds
        markersRef.current.forEach(marker => {
          const lngLat = marker.getLngLat();
          bounds.extend(lngLat);
        });

        // Fit map to bounds with padding
        mapRef.current.fitBounds(bounds, {
          padding: { top: 100, bottom: 100, left: 100, right: 100 },
          maxZoom: 15,
          duration: 1000
        });
      }
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
