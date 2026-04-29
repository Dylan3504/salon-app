import { NextResponse } from "next/server";
import { deleteOffer, updateOffer } from "@/lib/db";
import { parseOfferPayload } from "@/app/api/offers/route";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const offerId = Number(id);
    const body = await request.json();
    const payload = parseOfferPayload(body);

    if (!Number.isInteger(offerId) || offerId <= 0) {
      return NextResponse.json({ message: "Oferta invalida." }, { status: 400 });
    }

    if (!payload.title || !payload.description || !payload.priceLabel) {
      return NextResponse.json(
        { message: "Titulo, descripcion y precio son obligatorios." },
        { status: 400 },
      );
    }

    return NextResponse.json(await updateOffer(offerId, payload));
  } catch (error) {
    return NextResponse.json({ message: getErrorMessage(error) }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const offerId = Number(id);

    if (!Number.isInteger(offerId) || offerId <= 0) {
      return NextResponse.json({ message: "Oferta invalida." }, { status: 400 });
    }

    await deleteOffer(offerId);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return NextResponse.json({ message: getErrorMessage(error) }, { status: 500 });
  }
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Ocurrio un error inesperado.";
}
