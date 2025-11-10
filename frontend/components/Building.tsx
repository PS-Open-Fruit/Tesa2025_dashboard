"use client";

import * as THREE from "three";
import { useMemo } from "react";
import { Mesh } from "@react-three/fiber";

type Props = {
  vertices: [number, number][];
  height: number;
};

export default function Building({ vertices, height }: Props) {
  const shape = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(vertices[0][0], vertices[0][1]);
    for (let i = 1; i < vertices.length; i++) {
      s.lineTo(vertices[i][0], vertices[i][1]);
    }
    s.lineTo(vertices[0][0], vertices[0][1]);
    return s;
  }, [vertices]);

  const geometry = useMemo(
    () => new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false }),
    [shape, height]
  );

  return (
    <mesh geometry={geometry} rotation={[-Math.PI / 2, 0, 0]}>
      <meshStandardMaterial color="#66ccff" />
    </mesh>
  );
}
