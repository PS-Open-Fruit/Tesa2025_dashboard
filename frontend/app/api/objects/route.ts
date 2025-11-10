import { NextResponse } from "next/server";

export async function GET() {
  const data = {
    id: "obj1",
    position: [Math.random() * 10, 1, Math.random() * 10],
    rotation: [0, Math.random() * Math.PI, 0],
  };
  return NextResponse.json(data);
}
