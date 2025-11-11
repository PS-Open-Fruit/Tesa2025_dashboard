import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { cameraId, token } = await req.json();

    if (!cameraId || !token) {
      return NextResponse.json({ message: "cameraId และ token จำเป็นต้องระบุ" }, { status: 400 });
    }

    // Mock: validate or forward call here as needed
    // e.g., await fetch(process.env.CONNECT_ENDPOINT!, { method: 'POST', body: JSON.stringify({ cameraId, token }) })

    return NextResponse.json({
      message: "connected",
      cameraId,
      receivedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json({ message: error?.message || "unexpected error" }, { status: 500 });
  }
}

