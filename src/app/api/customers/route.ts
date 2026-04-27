import { NextResponse } from "next/server";
import { createCustomer, listCustomers } from "@/lib/db";

export async function GET() {
  try {
    return NextResponse.json(await listCustomers());
  } catch (error) {
    return NextResponse.json(
      { message: getErrorMessage(error) },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";
    const notes = typeof body.notes === "string" ? body.notes.trim() : "";

    if (!name || !phone) {
      return NextResponse.json(
        { message: "Nombre y telefono son obligatorios." },
        { status: 400 },
      );
    }

    const customer = await createCustomer({
      name,
      phone,
      notes: notes || null,
    });

    return NextResponse.json(customer, { status: 201 });
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
