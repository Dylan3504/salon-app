import { NextResponse } from "next/server";
import { listOffers, listServices, listWorks } from "@/lib/db";

export async function GET() {
  try {
    const [services, works, offers] = await Promise.all([
      listServices(),
      listWorks(),
      listOffers(),
    ]);

    return NextResponse.json({
      services,
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
