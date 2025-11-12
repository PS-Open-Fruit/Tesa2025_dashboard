import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { cameraId } = await req.json();

    if (!cameraId) {
      return NextResponse.json({ message: "cameraId จำเป็นต้องระบุ" }, { status: 400 });
    }

    const token = process.env.CAMID_TOKEN;
    const forwardEndpoint = process.env.CAMERA_CONNECT_API;

    if (!token) {
      return NextResponse.json({ message: "CAMID_TOKEN ไม่ได้ตั้งค่าใน environment" }, { status: 500 });
    }

    // If a real backend endpoint is configured, forward the request using the server-side token.
    if (forwardEndpoint) {
      const upstreamRes = await fetch(forwardEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // pass token in Authorization header or keep as body depending on upstream requirements
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ cameraId }),
      });

      const upstreamData = await upstreamRes.json().catch(() => null);
      return NextResponse.json({ forwarded: true, status: upstreamRes.status, data: upstreamData }, { status: 200 });
    }

    // Fallback/mock behaviour when no forward endpoint configured.
    return NextResponse.json({ message: "connected", cameraId, usedToken: Boolean(token) });
  } catch (error: any) {
    return NextResponse.json({ message: error?.message || "unexpected error" }, { status: 500 });
  }
}
