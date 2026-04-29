import { NextResponse } from "next/server";
import { listAppointments, listCustomers, listOffers, listServices, listWorks } from "@/lib/db";

export async function GET() {
  try {
    const [customers, services, appointments, works, offers] = await Promise.all([
      listCustomers(),
      listServices(),
      listAppointments(),
      listWorks(),
      listOffers(),
    ]);

    return NextResponse.json({
      customers,
      services,
      appointments,
      works,
      offers,
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
