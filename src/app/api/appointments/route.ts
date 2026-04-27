import { NextResponse } from "next/server";
import { AppointmentConflictError, createAppointment, listAppointments } from "@/lib/db";

export async function GET() {
  try {
    return NextResponse.json(await listAppointments());
  } catch (error) {
    const message = getErrorMessage(error);

    if (
      error instanceof AppointmentConflictError ||
      getErrorName(error) === "AppointmentConflictError" ||
      message.includes("choca con ese horario")
    ) {
      return NextResponse.json({ message }, { status: 409 });
    }

    return NextResponse.json(
      { message },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const customerId = Number(body.customerId);
    const serviceId = Number(body.serviceId);
    const startsAt = new Date(body.startsAt);
    const notes = typeof body.notes === "string" ? body.notes.trim() : "";

    if (!customerId || !serviceId || Number.isNaN(startsAt.getTime())) {
      return NextResponse.json(
        { message: "Cliente, servicio y fecha son obligatorios." },
        { status: 400 },
      );
    }

    const appointment = await createAppointment({
      customerId,
      serviceId,
      startsAt: startsAt.toISOString(),
      notes: notes || null,
    });

    return NextResponse.json(appointment, { status: 201 });
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

function getErrorName(error: unknown) {
  if (error instanceof Error) {
    return error.name;
  }

  return "";
}
