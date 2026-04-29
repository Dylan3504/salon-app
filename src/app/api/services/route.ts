import { NextResponse } from "next/server";
import { createService, listServices } from "@/lib/db";

export async function GET() {
  try {
    return NextResponse.json(await listServices());
  } catch (error) {
    return NextResponse.json({ message: getErrorMessage(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const payload = parseServicePayload(body);

    if (!payload.name || payload.priceCents <= 0 || payload.durationMinutes <= 0) {
      return NextResponse.json(
        { message: "Nombre, precio desde y duracion son obligatorios." },
        { status: 400 },
      );
    }

    return NextResponse.json(await createService(payload), { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: getErrorMessage(error) }, { status: 500 });
  }
}

export function parseServicePayload(body: Record<string, unknown>) {
  return {
    name: typeof body.name === "string" ? body.name.trim() : "",
    description: typeof body.description === "string" ? body.description.trim() || null : null,
    priceCents: Math.round(Number(body.price) * 100),
    durationMinutes: Number(body.durationMinutes),
  };
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Ocurrio un error inesperado.";
}
