"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useState, useEffect } from "react";
import * as THREE from "three";
import Building from "./Building";

type ObjectData = {
  id: string;
  position: [number, number, number];
  rotation: [number, number, number];
};

type BuildingData = {
  id: string;
  vertices: [number, number][];
  height: number;
};

export default function Scene3D() {
  const [objects, setObjects] = useState<ObjectData[]>([]);
  const [buildings, setBuildings] = useState<BuildingData[]>([]);

  // Example: load scene data
  useEffect(() => {
    setBuildings([
      {
        id: "b1",
        vertices: [
          [0, 0],
          [10, 0],
          [10, 8],
          [0, 8],
        ],
        height: 5,
      },
      {
        id: "b2",
        vertices: [
          [15, 0],
          [22, 0],
          [22, 10],
          [15, 10],
        ],
        height: 10,
      },
    ]);

    // Mock: receive object updates
    const interval = setInterval(() => {
      setObjects([
        {
          id: "obj1",
          position: [
            Math.sin(Date.now() * 0.001) * 5 + 5,
            1,
            Math.cos(Date.now() * 0.001) * 5 + 5,
          ],
          rotation: [0, Date.now() * 0.001, 0],
        },
      ]);
    }, 50);

    return () => clearInterval(interval);
  }, []);

  return (
    <Canvas camera={{ position: [20, 20, 20], fov: 50 }}>
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 20, 10]} intensity={1} />
      <gridHelper args={[100, 100]} />
      <OrbitControls />

      {/* Render buildings */}
      {buildings.map((b) => (
        <Building key={b.id} vertices={b.vertices} height={b.height} />
      ))}

      {/* Render moving objects */}
      {objects.map((o) => (
        <mesh
          key={o.id}
          position={o.position}
          rotation={o.rotation}
        >
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="orange" />
        </mesh>
      ))}
    </Canvas>
  );
}
