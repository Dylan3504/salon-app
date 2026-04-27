import { Pool } from "pg";

export type Customer = {
  id: number;
  name: string;
  phone: string;
  notes: string | null;
};

export type Service = {
  id: number;
  name: string;
  description: string | null;
  priceCents: number;
  durationMinutes: number;
  isActive: boolean;
};

export type Appointment = {
  id: number;
  startsAt: string;
  status: string;
  notes: string | null;
  customerId: number;
  serviceId: number;
  customer: Customer;
  service: Service;
};

export class AppointmentConflictError extends Error {
  constructor() {
    super("Ya existe una cita activa que choca con ese horario.");
    this.name = "AppointmentConflictError";
  }
}

export class CustomerHasAppointmentsError extends Error {
  constructor() {
    super("No se puede eliminar un cliente que ya tiene citas. Editalo o conserva su historial.");
    this.name = "CustomerHasAppointmentsError";
  }
}

type AppointmentRow = {
  id: number;
  starts_at: Date;
  status: string;
  notes: string | null;
  customer_id: number;
  service_id: number;
  customer_name: string;
  customer_phone: string;
  customer_notes: string | null;
  service_name: string;
  service_description: string | null;
  price_cents: number;
  duration_minutes: number;
  is_active: boolean;
};

const globalForPg = globalThis as unknown as {
  salonPool?: Pool;
  salonSchemaReady?: Promise<void>;
};

function getConnectionString() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("Falta DATABASE_URL en el archivo .env.");
  }

  return connectionString;
}

const pool =
  globalForPg.salonPool ??
  new Pool({
    connectionString: getConnectionString(),
  });

if (process.env.NODE_ENV !== "production") {
  globalForPg.salonPool = pool;
}

async function ensureSchema() {
  if (!globalForPg.salonSchemaReady) {
    globalForPg.salonSchemaReady = setupSchema();
  }

  return globalForPg.salonSchemaReady;
}

async function setupSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS customers (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS services (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      price_cents INTEGER NOT NULL,
      duration_minutes INTEGER NOT NULL,
      is_active BOOLEAN NOT NULL DEFAULT TRUE
    );

    CREATE TABLE IF NOT EXISTS appointments (
      id SERIAL PRIMARY KEY,
      starts_at TIMESTAMPTZ NOT NULL,
      status TEXT NOT NULL DEFAULT 'SCHEDULED',
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      customer_id INTEGER NOT NULL REFERENCES customers(id),
      service_id INTEGER NOT NULL REFERENCES services(id)
    );
  `);

  const [{ count: customerCount }] = (
    await pool.query<{ count: string }>("SELECT COUNT(*) AS count FROM customers")
  ).rows;
  const [{ count: serviceCount }] = (
    await pool.query<{ count: string }>("SELECT COUNT(*) AS count FROM services")
  ).rows;

  if (Number(customerCount) === 0) {
    await pool.query(
      `INSERT INTO customers (name, phone, notes)
      VALUES
        ($1, $2, $3),
        ($4, $5, $6),
        ($7, $8, $9)`,
      [
        "Mariana Lopez",
        "8888-1212",
        "Prefiere citas por la manana.",
        "Valeria Solis",
        "8877-3434",
        "Cliente frecuente de color.",
        "Camila Rojas",
        "8999-5656",
        null,
      ],
    );
  }

  if (Number(serviceCount) === 0) {
    await pool.query(
      `INSERT INTO services (name, description, price_cents, duration_minutes)
      VALUES
        ($1, $2, $3, $4),
        ($5, $6, $7, $8),
        ($9, $10, $11, $12)`,
      [
        "Corte de cabello",
        "Lavado, corte y peinado basico.",
        1200000,
        45,
        "Color completo",
        "Aplicacion de tinte y acabado.",
        3500000,
        120,
        "Manicure",
        "Limpieza, esmalte y acabado.",
        900000,
        50,
      ],
    );
  }
}

async function findActiveService(serviceId: number) {
  const result = await pool.query<{
    id: number;
    duration_minutes: number;
  }>(
    `SELECT id, duration_minutes
    FROM services
    WHERE id = $1 AND is_active = TRUE`,
    [serviceId],
  );

  return result.rows[0] ?? null;
}

async function hasAppointmentConflict(input: {
  startsAt: string;
  durationMinutes: number;
  ignoreAppointmentId?: number;
}) {
  const result = await pool.query<{ id: number }>(
    `SELECT appointments.id
    FROM appointments
    INNER JOIN services ON services.id = appointments.service_id
    WHERE appointments.status <> 'CANCELLED'
      AND ($3::INTEGER IS NULL OR appointments.id <> $3)
      AND appointments.starts_at < ($1::TIMESTAMPTZ + ($2 * INTERVAL '1 minute'))
      AND (appointments.starts_at + (services.duration_minutes * INTERVAL '1 minute')) > $1::TIMESTAMPTZ
    LIMIT 1`,
    [input.startsAt, input.durationMinutes, input.ignoreAppointmentId ?? null],
  );

  return (result.rowCount ?? 0) > 0;
}

export async function listCustomers() {
  await ensureSchema();

  const result = await pool.query<Customer>(
    "SELECT id, name, phone, notes FROM customers ORDER BY name ASC",
  );

  return result.rows;
}

export async function createCustomer(input: {
  name: string;
  phone: string;
  notes?: string | null;
}) {
  await ensureSchema();

  const result = await pool.query<Customer>(
    `INSERT INTO customers (name, phone, notes)
    VALUES ($1, $2, $3)
    RETURNING id, name, phone, notes`,
    [input.name, input.phone, input.notes ?? null],
  );

  return result.rows[0];
}

export async function updateCustomer(
  id: number,
  input: {
    name: string;
    phone: string;
    notes?: string | null;
  },
) {
  await ensureSchema();

  const result = await pool.query<Customer>(
    `UPDATE customers
    SET name = $2, phone = $3, notes = $4
    WHERE id = $1
    RETURNING id, name, phone, notes`,
    [id, input.name, input.phone, input.notes ?? null],
  );

  if ((result.rowCount ?? 0) === 0) {
    throw new Error("El cliente no existe.");
  }

  return result.rows[0];
}

export async function deleteCustomer(id: number) {
  await ensureSchema();

  const appointmentCount = await pool.query<{ count: string }>(
    "SELECT COUNT(*) AS count FROM appointments WHERE customer_id = $1",
    [id],
  );

  if (Number(appointmentCount.rows[0].count) > 0) {
    throw new CustomerHasAppointmentsError();
  }

  const result = await pool.query("DELETE FROM customers WHERE id = $1", [id]);

  if ((result.rowCount ?? 0) === 0) {
    throw new Error("El cliente no existe.");
  }
}

export async function listServices() {
  await ensureSchema();

  const result = await pool.query<{
    id: number;
    name: string;
    description: string | null;
    price_cents: number;
    duration_minutes: number;
    is_active: boolean;
  }>(
    `SELECT id, name, description, price_cents, duration_minutes, is_active
    FROM services
    WHERE is_active = TRUE
    ORDER BY name ASC`,
  );

  return result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    priceCents: row.price_cents,
    durationMinutes: row.duration_minutes,
    isActive: row.is_active,
  }));
}

export async function listAppointments() {
  await ensureSchema();

  const result = await pool.query<AppointmentRow>(
    `SELECT
      appointments.id,
      appointments.starts_at,
      appointments.status,
      appointments.notes,
      appointments.customer_id,
      appointments.service_id,
      customers.name AS customer_name,
      customers.phone AS customer_phone,
      customers.notes AS customer_notes,
      services.name AS service_name,
      services.description AS service_description,
      services.price_cents,
      services.duration_minutes,
      services.is_active
    FROM appointments
    INNER JOIN customers ON customers.id = appointments.customer_id
    INNER JOIN services ON services.id = appointments.service_id
    ORDER BY appointments.starts_at ASC`,
  );

  return result.rows.map((row) => ({
    id: row.id,
    startsAt: row.starts_at.toISOString(),
    status: row.status,
    notes: row.notes,
    customerId: row.customer_id,
    serviceId: row.service_id,
    customer: {
      id: row.customer_id,
      name: row.customer_name,
      phone: row.customer_phone,
      notes: row.customer_notes,
    },
    service: {
      id: row.service_id,
      name: row.service_name,
      description: row.service_description,
      priceCents: row.price_cents,
      durationMinutes: row.duration_minutes,
      isActive: row.is_active,
    },
  }));
}

export async function createAppointment(input: {
  customerId: number;
  serviceId: number;
  startsAt: string;
  notes?: string | null;
}) {
  await ensureSchema();

  const service = await findActiveService(input.serviceId);

  if (!service) {
    throw new Error("El servicio seleccionado no existe o esta inactivo.");
  }

  if (new Date(input.startsAt).getTime() < Date.now()) {
    throw new Error("No se pueden agendar citas en el pasado.");
  }

  const hasConflict = await hasAppointmentConflict({
    startsAt: input.startsAt,
    durationMinutes: service.duration_minutes,
  });

  if (hasConflict) {
    throw new AppointmentConflictError();
  }

  const result = await pool.query<{ id: number }>(
    `INSERT INTO appointments (customer_id, service_id, starts_at, notes)
    VALUES ($1, $2, $3, $4)
    RETURNING id`,
    [input.customerId, input.serviceId, input.startsAt, input.notes ?? null],
  );

  const appointments = await listAppointments();
  const appointment = appointments.find((item) => item.id === result.rows[0].id);

  if (!appointment) {
    throw new Error("No se pudo leer la cita creada.");
  }

  return appointment;
}

export async function updateAppointmentStatus(id: number, status: "SCHEDULED" | "COMPLETED" | "CANCELLED") {
  await ensureSchema();

  if (status === "SCHEDULED") {
    const appointmentResult = await pool.query<{
      id: number;
      starts_at: Date;
      duration_minutes: number;
    }>(
      `SELECT appointments.id, appointments.starts_at, services.duration_minutes
      FROM appointments
      INNER JOIN services ON services.id = appointments.service_id
      WHERE appointments.id = $1`,
      [id],
    );

    const appointment = appointmentResult.rows[0];

    if (!appointment) {
      throw new Error("La cita no existe.");
    }

    const hasConflict = await hasAppointmentConflict({
      startsAt: appointment.starts_at.toISOString(),
      durationMinutes: appointment.duration_minutes,
      ignoreAppointmentId: id,
    });

    if (hasConflict) {
      throw new AppointmentConflictError();
    }
  }

  const result = await pool.query<{ id: number }>(
    `UPDATE appointments
    SET status = $2
    WHERE id = $1
    RETURNING id`,
    [id, status],
  );

  if ((result.rowCount ?? 0) === 0) {
    throw new Error("La cita no existe.");
  }

  const appointment = (await listAppointments()).find((item) => item.id === id);

  if (!appointment) {
    throw new Error("No se pudo leer la cita actualizada.");
  }

  return appointment;
}

export async function deleteAppointment(id: number) {
  await ensureSchema();

  const result = await pool.query(
    `DELETE FROM appointments
    WHERE id = $1`,
    [id],
  );

  if ((result.rowCount ?? 0) === 0) {
    throw new Error("La cita no existe.");
  }
}
