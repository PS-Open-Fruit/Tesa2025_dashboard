"use server"

import { DetectionListResponse } from "./type";

export async function fetchCameraInfo(cameraId: string, token: string) {
  const url = `https://tesa-api.crma.dev/api/object-detection/info/${cameraId}`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      accept: "application/json",
      "x-camera-token": token,
    },
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.message || "Connect failed");
  }
  return data;
}

export const fetchDetectionshistory = async (cameraId: string, token: string) => {
    const res = await fetch(`https://tesa-api.crma.dev/api/object-detection/${cameraId}`, {
      method: "GET",
      headers: {
        accept: "application/json",
        "x-camera-token": token ,
      },
    });
    const data: DetectionListResponse = await res.json();
    if (!res.ok) {
      throw new Error((data as any)?.message || "โหลดข้อมูลไม่สำเร็จ");
    }
    return data
}
