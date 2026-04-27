"use client";

import { FormEvent, useMemo, useState } from "react";

type CustomerOption = {
  id: number;
  name: string;
};

type ServiceOption = {
  id: number;
  name: string;
  durationMinutes: number;
  priceCents: number;
};

type AppointmentFormProps = {
  customers: CustomerOption[];
  services: ServiceOption[];
  onSaved: () => void;
};

function toDatetimeLocalValue(date: Date) {
  const copy = new Date(date);
  copy.setMinutes(copy.getMinutes() - copy.getTimezoneOffset());
  return copy.toISOString().slice(0, 16);
}

export function AppointmentForm({ customers, services, onSaved }: AppointmentFormProps) {
  const defaultStart = useMemo(() => {
    const date = new Date();
    date.setHours(date.getHours() + 1, 0, 0, 0);
    return toDatetimeLocalValue(date);
  }, []);

  const [customerId, setCustomerId] = useState(customers[0]?.id.toString() ?? "");
  const [serviceId, setServiceId] = useState(services[0]?.id.toString() ?? "");
  const [startsAt, setStartsAt] = useState(defaultStart);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const selectedCustomerId = customerId || customers[0]?.id.toString() || "";
  const selectedServiceId = serviceId || services[0]?.id.toString() || "";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError("");

    const response = await fetch("/api/appointments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        customerId: selectedCustomerId,
        serviceId: selectedServiceId,
        startsAt,
        notes,
      }),
    });

    setIsSaving(false);

    if (!response.ok) {
      const payload = await response.json();
      setError(payload.message ?? "No se pudo crear la cita.");
      return;
    }

    setNotes("");
    onSaved();
  }

  return (
    <form className="appointment-form" onSubmit={handleSubmit}>
      <label>
        Cliente
        <select value={selectedCustomerId} onChange={(event) => setCustomerId(event.target.value)}>
          {customers.map((customer) => (
            <option key={customer.id} value={customer.id}>
              {customer.name}
            </option>
          ))}
        </select>
      </label>

      <label>
        Servicio
        <select value={selectedServiceId} onChange={(event) => setServiceId(event.target.value)}>
          {services.map((service) => (
            <option key={service.id} value={service.id}>
              {service.name}
            </option>
          ))}
        </select>
      </label>

      <label>
        Fecha y hora
        <input
          type="datetime-local"
          value={startsAt}
          onChange={(event) => setStartsAt(event.target.value)}
        />
      </label>

      <label>
        Notas
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Ejemplo: traer foto de referencia"
        />
      </label>

      {error ? <p className="form-error">{error}</p> : null}

      <button type="submit" disabled={isSaving || customers.length === 0 || services.length === 0}>
        {isSaving ? "Guardando..." : "Agendar cita"}
      </button>
    </form>
  );
}
