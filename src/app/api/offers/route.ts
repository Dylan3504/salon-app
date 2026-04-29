import { NextResponse } from "next/server";
import { createOffer, listOffers } from "@/lib/db";

export async function GET() {
  try {
    return NextResponse.json(await listOffers());
  } catch (error) {
    return NextResponse.json({ message: getErrorMessage(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const payload = parseOfferPayload(body);

    if (!payload.title || !payload.description || !payload.priceLabel) {
      return NextResponse.json(
        { message: "Titulo, descripcion y precio son obligatorios." },
        { status: 400 },
      );
    }

    return NextResponse.json(await createOffer(payload), { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: getErrorMessage(error) }, { status: 500 });
  }
}

export function parseOfferPayload(body: Record<string, unknown>) {
  return {
    title: typeof body.title === "string" ? body.title.trim() : "",
    description: typeof body.description === "string" ? body.description.trim() : "",
    priceLabel: typeof body.priceLabel === "string" ? body.priceLabel.trim() : "",
    startsOn: typeof body.startsOn === "string" ? body.startsOn || null : null,
    endsOn: typeof body.endsOn === "string" ? body.endsOn || null : null,
    isActive: Boolean(body.isActive),
  };
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Ocurrio un error inesperado.";
}
