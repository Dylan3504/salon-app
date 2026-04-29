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

export type Work = {
  id: number;
  title: string;
  category: string;
  customerName: string | null;
  notes: string | null;
  beforeImageUrl: string | null;
  afterImageUrl: string | null;
  completedAt: string | null;
};

export type Offer = {
  id: number;
  title: string;
  description: string;
  priceLabel: string;
  startsOn: string | null;
  endsOn: string | null;
  isActive: boolean;
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
  globalForPg.salonSchemaReady = setupSchema();

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

    CREATE TABLE IF NOT EXISTS works (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      customer_name TEXT,
      notes TEXT,
      before_image_url TEXT,
      after_image_url TEXT,
      completed_at DATE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS offers (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      price_label TEXT NOT NULL,
      starts_on DATE,
      ends_on DATE,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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

export async function createService(input: {
  name: string;
  description?: string | null;
  priceCents: number;
  durationMinutes: number;
}) {
  await ensureSchema();

  const result = await pool.query<{
    id: number;
    name: string;
    description: string | null;
    price_cents: number;
    duration_minutes: number;
    is_active: boolean;
  }>(
    `INSERT INTO services (name, description, price_cents, duration_minutes)
    VALUES ($1, $2, $3, $4)
    RETURNING id, name, description, price_cents, duration_minutes, is_active`,
    [input.name, input.description ?? null, input.priceCents, input.durationMinutes],
  );

  const row = result.rows[0];

  return {
    id: row.id,
    name: row.name,
    description: row.description,
    priceCents: row.price_cents,
    durationMinutes: row.duration_minutes,
    isActive: row.is_active,
  };
}

export async function updateService(
  id: number,
  input: {
    name: string;
    description?: string | null;
    priceCents: number;
    durationMinutes: number;
  },
) {
  await ensureSchema();

  const result = await pool.query<{
    id: number;
    name: string;
    description: string | null;
    price_cents: number;
    duration_minutes: number;
    is_active: boolean;
  }>(
    `UPDATE services
    SET name = $2, description = $3, price_cents = $4, duration_minutes = $5, is_active = TRUE
    WHERE id = $1
    RETURNING id, name, description, price_cents, duration_minutes, is_active`,
    [id, input.name, input.description ?? null, input.priceCents, input.durationMinutes],
  );

  if ((result.rowCount ?? 0) === 0) {
    throw new Error("El servicio no existe.");
  }

  const row = result.rows[0];

  return {
    id: row.id,
    name: row.name,
    description: row.description,
    priceCents: row.price_cents,
    durationMinutes: row.duration_minutes,
    isActive: row.is_active,
  };
}

export async function deleteService(id: number) {
  await ensureSchema();

  const appointmentCount = await pool.query<{ count: string }>(
    "SELECT COUNT(*) AS count FROM appointments WHERE service_id = $1",
    [id],
  );

  const hasAppointments = Number(appointmentCount.rows[0].count) > 0;
  const result = hasAppointments
    ? await pool.query("UPDATE services SET is_active = FALSE WHERE id = $1", [id])
    : await pool.query("DELETE FROM services WHERE id = $1", [id]);

  if ((result.rowCount ?? 0) === 0) {
    throw new Error("El servicio no existe.");
  }
}

export async function listWorks() {
  await ensureSchema();

  const result = await pool.query<{
    id: number;
    title: string;
    category: string;
    customer_name: string | null;
    notes: string | null;
    before_image_url: string | null;
    after_image_url: string | null;
    completed_at: Date | null;
  }>(
    `SELECT id, title, category, customer_name, notes, before_image_url, after_image_url, completed_at
    FROM works
    ORDER BY created_at DESC, id DESC`,
  );

  return result.rows.map((row) => ({
    id: row.id,
    title: row.title,
    category: row.category,
    customerName: row.customer_name,
    notes: row.notes,
    beforeImageUrl: row.before_image_url,
    afterImageUrl: row.after_image_url,
    completedAt: row.completed_at ? row.completed_at.toISOString().slice(0, 10) : null,
  }));
}

export async function createWork(input: {
  title: string;
  category: string;
  customerName?: string | null;
  notes?: string | null;
  beforeImageUrl?: string | null;
  afterImageUrl?: string | null;
  completedAt?: string | null;
}) {
  await ensureSchema();

  const result = await pool.query<{ id: number }>(
    `INSERT INTO works (title, category, customer_name, notes, before_image_url, after_image_url, completed_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING id`,
    [
      input.title,
      input.category,
      input.customerName ?? null,
      input.notes ?? null,
      input.beforeImageUrl ?? null,
      input.afterImageUrl ?? null,
      input.completedAt || null,
    ],
  );

  return (await listWorks()).find((work) => work.id === result.rows[0].id);
}

export async function updateWork(
  id: number,
  input: {
    title: string;
    category: string;
    customerName?: string | null;
    notes?: string | null;
    beforeImageUrl?: string | null;
    afterImageUrl?: string | null;
    completedAt?: string | null;
  },
) {
  await ensureSchema();

  const result = await pool.query(
    `UPDATE works
    SET title = $2, category = $3, customer_name = $4, notes = $5,
      before_image_url = $6, after_image_url = $7, completed_at = $8
    WHERE id = $1`,
    [
      id,
      input.title,
      input.category,
      input.customerName ?? null,
      input.notes ?? null,
      input.beforeImageUrl ?? null,
      input.afterImageUrl ?? null,
      input.completedAt || null,
    ],
  );

  if ((result.rowCount ?? 0) === 0) {
    throw new Error("El trabajo no existe.");
  }

  return (await listWorks()).find((work) => work.id === id);
}

export async function deleteWork(id: number) {
  await ensureSchema();

  const result = await pool.query("DELETE FROM works WHERE id = $1", [id]);

  if ((result.rowCount ?? 0) === 0) {
    throw new Error("El trabajo no existe.");
  }
}

export async function listOffers() {
  await ensureSchema();

  const result = await pool.query<{
    id: number;
    title: string;
    description: string;
    price_label: string;
    starts_on: Date | null;
    ends_on: Date | null;
    is_active: boolean;
  }>(
    `SELECT id, title, description, price_label, starts_on, ends_on, is_active
    FROM offers
    ORDER BY is_active DESC, created_at DESC, id DESC`,
  );

  return result.rows.map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    priceLabel: row.price_label,
    startsOn: row.starts_on ? row.starts_on.toISOString().slice(0, 10) : null,
    endsOn: row.ends_on ? row.ends_on.toISOString().slice(0, 10) : null,
    isActive: row.is_active,
  }));
}

export async function createOffer(input: {
  title: string;
  description: string;
  priceLabel: string;
  startsOn?: string | null;
  endsOn?: string | null;
  isActive: boolean;
}) {
  await ensureSchema();

  const result = await pool.query<{ id: number }>(
    `INSERT INTO offers (title, description, price_label, starts_on, ends_on, is_active)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id`,
    [
      input.title,
      input.description,
      input.priceLabel,
      input.startsOn || null,
      input.endsOn || null,
      input.isActive,
    ],
  );

  return (await listOffers()).find((offer) => offer.id === result.rows[0].id);
}

export async function updateOffer(
  id: number,
  input: {
    title: string;
    description: string;
    priceLabel: string;
    startsOn?: string | null;
    endsOn?: string | null;
    isActive: boolean;
  },
) {
  await ensureSchema();

  const result = await pool.query(
    `UPDATE offers
    SET title = $2, description = $3, price_label = $4, starts_on = $5, ends_on = $6, is_active = $7
    WHERE id = $1`,
    [
      id,
      input.title,
      input.description,
      input.priceLabel,
      input.startsOn || null,
      input.endsOn || null,
      input.isActive,
    ],
  );

  if ((result.rowCount ?? 0) === 0) {
    throw new Error("La oferta no existe.");
  }

  return (await listOffers()).find((offer) => offer.id === id);
}

export async function deleteOffer(id: number) {
  await ensureSchema();

  const result = await pool.query("DELETE FROM offers WHERE id = $1", [id]);

  if ((result.rowCount ?? 0) === 0) {
    throw new Error("La oferta no existe.");
  }
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
