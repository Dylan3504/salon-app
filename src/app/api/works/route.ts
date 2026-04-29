import { NextResponse } from "next/server";
import { createWork, listWorks } from "@/lib/db";

export async function GET() {
  try {
    return NextResponse.json(await listWorks());
  } catch (error) {
    return NextResponse.json({ message: getErrorMessage(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const payload = parseWorkPayload(body);

    if (!payload.title || !payload.category) {
      return NextResponse.json(
        { message: "Titulo y categoria son obligatorios." },
        { status: 400 },
      );
    }

    return NextResponse.json(await createWork(payload), { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: getErrorMessage(error) }, { status: 500 });
  }
}

export function parseWorkPayload(body: Record<string, unknown>) {
  return {
    title: typeof body.title === "string" ? body.title.trim() : "",
    category: typeof body.category === "string" ? body.category.trim() : "",
    customerName: typeof body.customerName === "string" ? body.customerName.trim() || null : null,
    notes: typeof body.notes === "string" ? body.notes.trim() || null : null,
    beforeImageUrl:
      typeof body.beforeImageUrl === "string" ? body.beforeImageUrl.trim() || null : null,
    afterImageUrl:
      typeof body.afterImageUrl === "string" ? body.afterImageUrl.trim() || null : null,
    completedAt: typeof body.completedAt === "string" ? body.completedAt || null : null,
  };
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Ocurrio un error inesperado.";
}
