import { NextResponse } from "next/server";
import { CustomerHasAppointmentsError, deleteCustomer, updateCustomer } from "@/lib/db";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const customerId = Number(id);
    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";
    const notes = typeof body.notes === "string" ? body.notes.trim() : "";

    if (!Number.isInteger(customerId) || customerId <= 0) {
      return NextResponse.json({ message: "Cliente invalido." }, { status: 400 });
    }

    if (!name || !phone) {
      return NextResponse.json(
        { message: "Nombre y telefono son obligatorios." },
        { status: 400 },
      );
    }

    const customer = await updateCustomer(customerId, {
      name,
      phone,
      notes: notes || null,
    });

    return NextResponse.json(customer);
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
    const customerId = Number(id);

    if (!Number.isInteger(customerId) || customerId <= 0) {
      return NextResponse.json({ message: "Cliente invalido." }, { status: 400 });
    }

    await deleteCustomer(customerId);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const message = getErrorMessage(error);

    if (
      error instanceof CustomerHasAppointmentsError ||
      getErrorName(error) === "CustomerHasAppointmentsError" ||
      message.includes("ya tiene citas")
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
