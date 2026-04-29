import { NextResponse } from "next/server";
import { deleteService, updateService } from "@/lib/db";
import { parseServicePayload } from "@/app/api/services/route";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const serviceId = Number(id);
    const body = await request.json();
    const payload = parseServicePayload(body);

    if (!Number.isInteger(serviceId) || serviceId <= 0) {
      return NextResponse.json({ message: "Servicio invalido." }, { status: 400 });
    }

    if (!payload.name || payload.priceCents <= 0 || payload.durationMinutes <= 0) {
      return NextResponse.json(
        { message: "Nombre, precio desde y duracion son obligatorios." },
        { status: 400 },
      );
    }

    return NextResponse.json(await updateService(serviceId, payload));
  } catch (error) {
    return NextResponse.json({ message: getErrorMessage(error) }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const serviceId = Number(id);

    if (!Number.isInteger(serviceId) || serviceId <= 0) {
      return NextResponse.json({ message: "Servicio invalido." }, { status: 400 });
    }

    await deleteService(serviceId);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return NextResponse.json({ message: getErrorMessage(error) }, { status: 500 });
  }
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Ocurrio un error inesperado.";
}
