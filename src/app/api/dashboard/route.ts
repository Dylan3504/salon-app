import { NextResponse } from "next/server";
import { listAppointments, listCustomers, listServices } from "@/lib/db";

export async function GET() {
  try {
    const [customers, services, appointments] = await Promise.all([
      listCustomers(),
      listServices(),
      listAppointments(),
    ]);

    return NextResponse.json({
      customers,
      services,
      appointments,
    });
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
