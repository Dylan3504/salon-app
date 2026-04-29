import { NextResponse } from "next/server";
import {
  AppointmentConflictError,
  createAppointment,
  createCustomer,
  findCustomerByPhone,
} from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";
    const serviceId = Number(body.serviceId);
    const startsAt = new Date(body.startsAt);
    const notes = typeof body.notes === "string" ? body.notes.trim() : "";

    if (!name || !phone || !serviceId || Number.isNaN(startsAt.getTime())) {
      return NextResponse.json(
        { message: "Nombre, telefono, servicio y fecha son obligatorios." },
        { status: 400 },
      );
    }

    const existingCustomer = await findCustomerByPhone(phone);
    const customer =
      existingCustomer ??
      (await createCustomer({
        name,
        phone,
        notes: "Creada desde portal de clienta.",
      }));

    const appointment = await createAppointment({
      customerId: customer.id,
      serviceId,
      startsAt: startsAt.toISOString(),
      notes: notes || "Solicitada desde portal de clienta.",
    });

    return NextResponse.json(appointment, { status: 201 });
  } catch (error) {
    const message = getErrorMessage(error);

    if (
      error instanceof AppointmentConflictError ||
      getErrorName(error) === "AppointmentConflictError" ||
      message.includes("choca con ese horario")
    ) {
      return NextResponse.json({ message }, { status: 409 });
    }

    return NextResponse.json({ message }, { status: 500 });
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
