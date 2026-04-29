import { NextResponse } from "next/server";
import { deleteWork, updateWork } from "@/lib/db";
import { parseWorkPayload } from "@/app/api/works/route";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const workId = Number(id);
    const body = await request.json();
    const payload = parseWorkPayload(body);

    if (!Number.isInteger(workId) || workId <= 0) {
      return NextResponse.json({ message: "Trabajo invalido." }, { status: 400 });
    }

    if (!payload.title || !payload.category) {
      return NextResponse.json(
        { message: "Titulo y categoria son obligatorios." },
        { status: 400 },
      );
    }

    return NextResponse.json(await updateWork(workId, payload));
  } catch (error) {
    return NextResponse.json({ message: getErrorMessage(error) }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const workId = Number(id);

    if (!Number.isInteger(workId) || workId <= 0) {
      return NextResponse.json({ message: "Trabajo invalido." }, { status: 400 });
    }

    await deleteWork(workId);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return NextResponse.json({ message: getErrorMessage(error) }, { status: 500 });
  }
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Ocurrio un error inesperado.";
}
