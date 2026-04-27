import { NextResponse } from "next/server";
import { deleteAppointment, updateAppointmentStatus } from "@/lib/db";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const appointmentId = Number(id);
    const body = await request.json();
    const status = body.status;

    if (!Number.isInteger(appointmentId) || appointmentId <= 0) {
      return NextResponse.json({ message: "Cita invalida." }, { status: 400 });
    }

    if (!["SCHEDULED", "COMPLETED", "CANCELLED"].includes(status)) {
      return NextResponse.json({ message: "Estado invalido." }, { status: 400 });
    }

    const appointment = await updateAppointmentStatus(appointmentId, status);

    return NextResponse.json(appointment);
  } catch (error) {
    return NextResponse.json(
      { message: getErrorMessage(error) },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const appointmentId = Number(id);

    if (!Number.isInteger(appointmentId) || appointmentId <= 0) {
      return NextResponse.json({ message: "Cita invalida." }, { status: 400 });
    }

    await deleteAppointment(appointmentId);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return NextResponse.json(
      { message: getErrorMessage(error) },
      { status: 500 },
    );
  }
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Ocurrio un error inesperado.";
}
