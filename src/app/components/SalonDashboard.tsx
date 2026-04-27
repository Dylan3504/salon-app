"use client";

import { useEffect, useState } from "react";
import { AppointmentForm } from "@/app/components/AppointmentForm";
import { CustomerForm } from "@/app/components/CustomerForm";

type Customer = {
  id: number;
  name: string;
  phone: string;
  notes: string | null;
};

type Service = {
  id: number;
  name: string;
  description: string | null;
  priceCents: number;
  durationMinutes: number;
  isActive: boolean;
};

type Appointment = {
  id: number;
  startsAt: string;
  status: string;
  notes: string | null;
  customerId: number;
  serviceId: number;
  customer: Customer;
  service: Service;
};

type DashboardData = {
  customers: Customer[];
  services: Service[];
  appointments: Appointment[];
};

function formatMoney(cents: number) {
  return new Intl.NumberFormat("es-CR", {
    style: "currency",
    currency: "CRC",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("es-CR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function getStatusLabel(status: string) {
  const labels: Record<string, string> = {
    SCHEDULED: "Programada",
    COMPLETED: "Completada",
    CANCELLED: "Cancelada",
  };

  return labels[status] ?? status;
}

export function SalonDashboard() {
  const [data, setData] = useState<DashboardData>({
    customers: [],
    services: [],
    appointments: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadDashboard(signal?: AbortSignal) {
    try {
      const response = await fetch("/api/dashboard", { signal });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message ?? "No se pudo cargar la agenda.");
      }

      setData(payload);
      setError("");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Error inesperado.");
    } finally {
      setIsLoading(false);
    }
  }

  async function updateAppointmentStatus(id: number, status: "COMPLETED" | "CANCELLED") {
    try {
      const response = await fetch(`/api/appointments/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message ?? "No se pudo actualizar la cita.");
      }

      await loadDashboard();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Error inesperado.");
    }
  }

  async function deleteAppointment(id: number) {
    const shouldDelete = window.confirm("Esta accion elimina la cita. Deseas continuar?");

    if (!shouldDelete) {
      return;
    }

    try {
      const response = await fetch(`/api/appointments/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.message ?? "No se pudo eliminar la cita.");
      }

      await loadDashboard();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Error inesperado.");
    }
  }

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/dashboard", { signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.message ?? "No se pudo cargar la agenda.");
        }

        setData(payload);
        setError("");
      })
      .catch((caughtError) => {
        if (caughtError instanceof DOMException && caughtError.name === "AbortError") {
          return;
        }

        setError(caughtError instanceof Error ? caughtError.message : "Error inesperado.");
      })
      .finally(() => {
        setIsLoading(false);
      });

    return () => controller.abort();
  }, []);

  return (
    <main className="app-shell">
      <section className="topbar">
        <div>
          <p className="eyebrow">Salon de belleza</p>
          <h1>Agenda de citas</h1>
        </div>
        <div className="stat">
          <span>{data.appointments.length}</span>
          <small>citas registradas</small>
        </div>
      </section>

      {error ? (
        <section className="system-message">
          <h2>No se pudo conectar con PostgreSQL</h2>
          <p>{error}</p>
        </section>
      ) : null}

      <section className="dashboard-grid">
        <div className="panel">
          <div className="panel-heading">
            <h2>Nueva cita</h2>
            <p>Frontend: React captura los datos y llama a la API.</p>
          </div>
          <AppointmentForm
            customers={data.customers}
            services={data.services}
            onSaved={loadDashboard}
          />
        </div>

        <div className="panel">
          <div className="panel-heading">
            <h2>Proximas citas</h2>
            <p>Backend: la API consulta PostgreSQL y devuelve JSON.</p>
          </div>

          <div className="appointment-list">
            {isLoading ? (
              <p className="empty-state">Cargando agenda...</p>
            ) : data.appointments.length === 0 ? (
              <p className="empty-state">Todavia no hay citas.</p>
            ) : (
              data.appointments.map((appointment) => (
                <article className="appointment-card" key={appointment.id}>
                  <div>
                    <h3>{appointment.customer.name}</h3>
                    <p>
                      {appointment.service.name} - {appointment.service.durationMinutes} min
                    </p>
                  </div>
                  <div className="appointment-meta">
                    <span className={`status-badge status-${appointment.status.toLowerCase()}`}>
                      {getStatusLabel(appointment.status)}
                    </span>
                    <span>{formatDate(new Date(appointment.startsAt))}</span>
                    <strong>{formatMoney(appointment.service.priceCents)}</strong>
                  </div>
                  <div className="appointment-actions">
                    {appointment.status !== "COMPLETED" ? (
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => updateAppointmentStatus(appointment.id, "COMPLETED")}
                      >
                        Completar
                      </button>
                    ) : null}
                    {appointment.status !== "CANCELLED" ? (
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => updateAppointmentStatus(appointment.id, "CANCELLED")}
                      >
                        Cancelar
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="danger-button"
                      onClick={() => deleteAppointment(appointment.id)}
                    >
                      Eliminar
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="management-grid">
        <div className="panel">
          <div className="panel-heading">
            <h2>Nuevo cliente</h2>
            <p>Guarda clientes en PostgreSQL para usarlos al agendar.</p>
          </div>
          <CustomerForm onSaved={loadDashboard} />
        </div>

        <div className="panel">
          <div className="panel-heading">
            <h2>Clientes</h2>
            <p>Lista leida directamente desde la tabla customers.</p>
          </div>
          <div className="customer-list">
            {data.customers.map((customer) => (
              <article className="customer-row" key={customer.id}>
                <div>
                  <h3>{customer.name}</h3>
                  <p>{customer.phone}</p>
                </div>
                {customer.notes ? <span>{customer.notes}</span> : null}
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="service-strip">
        {data.services.map((service) => (
          <article key={service.id}>
            <h3>{service.name}</h3>
            <p>{service.durationMinutes} min</p>
            <strong>{formatMoney(service.priceCents)}</strong>
          </article>
        ))}
      </section>
    </main>
  );
}
