"use client";

import { FormEvent, useEffect, useState } from "react";
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

type Work = {
  id: number;
  title: string;
  category: string;
  customerName: string | null;
  notes: string | null;
  beforeImageUrl: string | null;
  afterImageUrl: string | null;
  completedAt: string | null;
};

type Offer = {
  id: number;
  title: string;
  description: string;
  priceLabel: string;
  startsOn: string | null;
  endsOn: string | null;
  isActive: boolean;
};

type DashboardData = {
  customers: Customer[];
  services: Service[];
  appointments: Appointment[];
  works: Work[];
  offers: Offer[];
};

type ActiveTab = "agenda" | "customers" | "services" | "works" | "offers";

const tabs: Array<{ id: ActiveTab; label: string }> = [
  { id: "agenda", label: "Agenda" },
  { id: "customers", label: "Clientes" },
  { id: "services", label: "Servicios" },
  { id: "works", label: "Trabajos" },
  { id: "offers", label: "Ofertas" },
];

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
  const [activeTab, setActiveTab] = useState<ActiveTab>("agenda");
  const [data, setData] = useState<DashboardData>({
    customers: [],
    services: [],
    appointments: [],
    works: [],
    offers: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [editingWork, setEditingWork] = useState<Work | null>(null);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);

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

  async function updateAppointmentStatus(
    id: number,
    status: "SCHEDULED" | "COMPLETED" | "CANCELLED",
  ) {
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

  async function deleteCustomer(id: number) {
    const shouldDelete = window.confirm(
      "Esta accion elimina el cliente si no tiene citas. Deseas continuar?",
    );

    if (!shouldDelete) {
      return;
    }

    try {
      const response = await fetch(`/api/customers/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.message ?? "No se pudo eliminar el cliente.");
      }

      if (editingCustomer?.id === id) {
        setEditingCustomer(null);
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

  async function deleteEntity(endpoint: string, id: number, label: string) {
    const shouldDelete = window.confirm(`Esta accion elimina ${label}. Deseas continuar?`);

    if (!shouldDelete) {
      return;
    }

    try {
      const response = await fetch(`/api/${endpoint}/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.message ?? "No se pudo eliminar.");
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
          <h1>Gestion del salon</h1>
        </div>
        <div className="stat-group">
          <div className="stat">
            <span>{data.appointments.length}</span>
            <small>citas</small>
          </div>
          <div className="stat">
            <span>{data.customers.length}</span>
            <small>clientes</small>
          </div>
        </div>
      </section>

      <nav className="tabbar" aria-label="Secciones principales">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={activeTab === tab.id ? "tab-button active" : "tab-button"}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {error ? (
        <section className="system-message">
          <h2>No se pudo completar la accion</h2>
          <p>{error}</p>
        </section>
      ) : null}

      {activeTab === "agenda" ? (
        <AgendaView
          appointments={data.appointments}
          customers={data.customers}
          deleteAppointment={deleteAppointment}
          isLoading={isLoading}
          loadDashboard={loadDashboard}
          services={data.services}
          updateAppointmentStatus={updateAppointmentStatus}
        />
      ) : null}

      {activeTab === "customers" ? (
        <CustomersView
          customers={data.customers}
          deleteCustomer={deleteCustomer}
          editingCustomer={editingCustomer}
          loadDashboard={loadDashboard}
          setEditingCustomer={setEditingCustomer}
        />
      ) : null}

      {activeTab === "services" ? (
        <ServicesView
          deleteService={(id) => deleteEntity("services", id, "el servicio")}
          editingService={editingService}
          loadDashboard={loadDashboard}
          services={data.services}
          setEditingService={setEditingService}
        />
      ) : null}

      {activeTab === "works" ? (
        <WorksView
          deleteWork={(id) => deleteEntity("works", id, "el trabajo")}
          editingWork={editingWork}
          loadDashboard={loadDashboard}
          setEditingWork={setEditingWork}
          works={data.works}
        />
      ) : null}

      {activeTab === "offers" ? (
        <OffersView
          deleteOffer={(id) => deleteEntity("offers", id, "la oferta")}
          editingOffer={editingOffer}
          loadDashboard={loadDashboard}
          offers={data.offers}
          setEditingOffer={setEditingOffer}
        />
      ) : null}
    </main>
  );
}

function AgendaView({
  appointments,
  customers,
  deleteAppointment,
  isLoading,
  loadDashboard,
  services,
  updateAppointmentStatus,
}: {
  appointments: Appointment[];
  customers: Customer[];
  deleteAppointment: (id: number) => Promise<void>;
  isLoading: boolean;
  loadDashboard: () => Promise<void>;
  services: Service[];
  updateAppointmentStatus: (
    id: number,
    status: "SCHEDULED" | "COMPLETED" | "CANCELLED",
  ) => Promise<void>;
}) {
  return (
    <section className="dashboard-grid">
      <div className="panel">
        <div className="panel-heading">
          <h2>Nueva cita</h2>
          <p>Agenda servicios y valida choques de horario.</p>
        </div>
        <AppointmentForm customers={customers} services={services} onSaved={loadDashboard} />
      </div>

      <div className="panel">
        <div className="panel-heading">
          <h2>Proximas citas</h2>
          <p>Administra estados, cancelaciones y reactivaciones.</p>
        </div>

        <div className="appointment-list">
          {isLoading ? (
            <p className="empty-state">Cargando agenda...</p>
          ) : appointments.length === 0 ? (
            <p className="empty-state">Todavia no hay citas.</p>
          ) : (
            appointments.map((appointment) => (
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
                  <strong>Desde {formatMoney(appointment.service.priceCents)}</strong>
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
                  {appointment.status === "CANCELLED" ? (
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => updateAppointmentStatus(appointment.id, "SCHEDULED")}
                    >
                      Reactivar
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
  );
}

function CustomersView({
  customers,
  deleteCustomer,
  editingCustomer,
  loadDashboard,
  setEditingCustomer,
}: {
  customers: Customer[];
  deleteCustomer: (id: number) => Promise<void>;
  editingCustomer: Customer | null;
  loadDashboard: () => Promise<void>;
  setEditingCustomer: (customer: Customer | null) => void;
}) {
  return (
    <section className="management-grid">
      <div className="panel">
        <div className="panel-heading">
          <h2>{editingCustomer ? "Editar cliente" : "Nuevo cliente"}</h2>
          <p>
            {editingCustomer
              ? "Corrige los datos guardados en PostgreSQL."
              : "Guarda clientes para usarlos al agendar."}
          </p>
        </div>
        <CustomerForm
          key={editingCustomer?.id ?? "new-customer"}
          customer={editingCustomer}
          onCancelEdit={() => setEditingCustomer(null)}
          onSaved={async () => {
            setEditingCustomer(null);
            await loadDashboard();
          }}
        />
      </div>

      <div className="panel">
        <div className="panel-heading">
          <h2>Clientes</h2>
          <p>Edita informacion o conserva el historial de citas.</p>
        </div>
        <div className="customer-list">
          {customers.map((customer) => (
            <article className="customer-row" key={customer.id}>
              <div>
                <h3>{customer.name}</h3>
                <p>{customer.phone}</p>
              </div>
              {customer.notes ? <span>{customer.notes}</span> : null}
              <div className="customer-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setEditingCustomer(customer)}
                >
                  Editar
                </button>
                <button
                  type="button"
                  className="danger-button"
                  onClick={() => deleteCustomer(customer.id)}
                >
                  Eliminar
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function ServicesView({
  deleteService,
  editingService,
  loadDashboard,
  services,
  setEditingService,
}: {
  deleteService: (id: number) => void;
  editingService: Service | null;
  loadDashboard: () => Promise<void>;
  services: Service[];
  setEditingService: (service: Service | null) => void;
}) {
  return (
    <section className="management-grid">
      <div className="panel">
        <div className="panel-heading">
          <h2>{editingService ? "Editar servicio" : "Nuevo servicio"}</h2>
          <p>Los precios se muestran como desde porque cada cabello cambia.</p>
        </div>
        <ServiceForm
          key={editingService?.id ?? "new-service"}
          onCancelEdit={() => setEditingService(null)}
          onSaved={async () => {
            setEditingService(null);
            await loadDashboard();
          }}
          service={editingService}
        />
      </div>

      <div className="panel">
        <div className="panel-heading">
          <h2>Servicios</h2>
          <p>Catalogo base para precios, duraciones y agenda.</p>
        </div>
        <div className="service-grid">
          {services.map((service) => (
            <article className="service-card" key={service.id}>
              <div>
                <h3>{service.name}</h3>
                <p>{service.description ?? "Sin descripcion"}</p>
              </div>
              <div className="service-card-footer">
                <span>{service.durationMinutes} min</span>
                <strong>Desde {formatMoney(service.priceCents)}</strong>
              </div>
              <div className="card-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setEditingService(service)}
                >
                  Editar
                </button>
                <button
                  type="button"
                  className="danger-button"
                  onClick={() => deleteService(service.id)}
                >
                  Eliminar
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function WorksView({
  deleteWork,
  editingWork,
  loadDashboard,
  setEditingWork,
  works,
}: {
  deleteWork: (id: number) => void;
  editingWork: Work | null;
  loadDashboard: () => Promise<void>;
  setEditingWork: (work: Work | null) => void;
  works: Work[];
}) {
  return (
    <section className="management-grid">
      <div className="panel">
        <div className="panel-heading">
          <h2>{editingWork ? "Editar trabajo" : "Nuevo trabajo"}</h2>
          <p>Registra color, alisados, canas, nuevos y antes/despues.</p>
        </div>
        <WorkForm
          key={editingWork?.id ?? "new-work"}
          onCancelEdit={() => setEditingWork(null)}
          onSaved={async () => {
            setEditingWork(null);
            await loadDashboard();
          }}
          work={editingWork}
        />
      </div>

      <div className="category-grid">
        {works.length === 0 ? (
          <p className="empty-state">Todavia no hay trabajos registrados.</p>
        ) : (
          works.map((work) => (
            <article className="category-card" key={work.id}>
              <span>{work.category}</span>
              <h3>{work.title}</h3>
              <p>{work.customerName || "Sin cliente asociado"}</p>
              {work.notes ? <p>{work.notes}</p> : null}
              <div className="card-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setEditingWork(work)}
                >
                  Editar
                </button>
                <button
                  type="button"
                  className="danger-button"
                  onClick={() => deleteWork(work.id)}
                >
                  Eliminar
                </button>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}

function OffersView({
  deleteOffer,
  editingOffer,
  loadDashboard,
  offers,
  setEditingOffer,
}: {
  deleteOffer: (id: number) => void;
  editingOffer: Offer | null;
  loadDashboard: () => Promise<void>;
  offers: Offer[];
  setEditingOffer: (offer: Offer | null) => void;
}) {
  return (
    <section className="management-grid">
      <div className="panel">
        <div className="panel-heading">
          <h2>{editingOffer ? "Editar oferta" : "Nueva oferta"}</h2>
          <p>Promociones diarias para mover horarios disponibles.</p>
        </div>
        <OfferForm
          key={editingOffer?.id ?? "new-offer"}
          offer={editingOffer}
          onCancelEdit={() => setEditingOffer(null)}
          onSaved={async () => {
            setEditingOffer(null);
            await loadDashboard();
          }}
        />
      </div>

      <div className="offer-grid">
        {offers.length === 0 ? (
          <p className="empty-state">Todavia no hay ofertas registradas.</p>
        ) : (
          offers.map((offer) => (
            <article className="offer-card" key={offer.id}>
              <span>{offer.isActive ? "Activa" : "Inactiva"}</span>
              <h3>{offer.title}</h3>
              <p>{offer.description}</p>
              <strong>{offer.priceLabel}</strong>
              <div className="card-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setEditingOffer(offer)}
                >
                  Editar
                </button>
                <button
                  type="button"
                  className="danger-button"
                  onClick={() => deleteOffer(offer.id)}
                >
                  Eliminar
                </button>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}

function ServiceForm({
  onCancelEdit,
  onSaved,
  service,
}: {
  onCancelEdit: () => void;
  onSaved: () => void;
  service: Service | null;
}) {
  const [name, setName] = useState(service?.name ?? "");
  const [description, setDescription] = useState(service?.description ?? "");
  const [price, setPrice] = useState(service ? String(service.priceCents / 100) : "");
  const [durationMinutes, setDurationMinutes] = useState(
    service ? String(service.durationMinutes) : "",
  );
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError("");

    const response = await fetch(service ? `/api/services/${service.id}` : "/api/services", {
      method: service ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description, price, durationMinutes }),
    });

    setIsSaving(false);

    if (!response.ok) {
      const payload = await response.json();
      setError(payload.message ?? "No se pudo guardar el servicio.");
      return;
    }

    onSaved();
  }

  return (
    <form className="appointment-form" onSubmit={handleSubmit}>
      <label>
        Nombre
        <input value={name} onChange={(event) => setName(event.target.value)} />
      </label>
      <label>
        Descripcion
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </label>
      <label>
        Precio desde
        <input
          min="0"
          type="number"
          value={price}
          onChange={(event) => setPrice(event.target.value)}
        />
      </label>
      <label>
        Duracion aproximada en minutos
        <input
          min="1"
          type="number"
          value={durationMinutes}
          onChange={(event) => setDurationMinutes(event.target.value)}
        />
      </label>
      {error ? <p className="form-error">{error}</p> : null}
      <div className="form-actions">
        <button type="submit" disabled={isSaving}>
          {isSaving ? "Guardando..." : service ? "Actualizar servicio" : "Guardar servicio"}
        </button>
        {service ? (
          <button type="button" className="secondary-button" onClick={onCancelEdit}>
            Cancelar edicion
          </button>
        ) : null}
      </div>
    </form>
  );
}

function WorkForm({
  onCancelEdit,
  onSaved,
  work,
}: {
  onCancelEdit: () => void;
  onSaved: () => void;
  work: Work | null;
}) {
  const [title, setTitle] = useState(work?.title ?? "");
  const [category, setCategory] = useState(work?.category ?? "Color");
  const [customerName, setCustomerName] = useState(work?.customerName ?? "");
  const [notes, setNotes] = useState(work?.notes ?? "");
  const [beforeImageUrl, setBeforeImageUrl] = useState(work?.beforeImageUrl ?? "");
  const [afterImageUrl, setAfterImageUrl] = useState(work?.afterImageUrl ?? "");
  const [completedAt, setCompletedAt] = useState(work?.completedAt ?? "");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError("");

    const response = await fetch(work ? `/api/works/${work.id}` : "/api/works", {
      method: work ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        category,
        customerName,
        notes,
        beforeImageUrl,
        afterImageUrl,
        completedAt,
      }),
    });

    setIsSaving(false);

    if (!response.ok) {
      const payload = await response.json();
      setError(payload.message ?? "No se pudo guardar el trabajo.");
      return;
    }

    onSaved();
  }

  return (
    <form className="appointment-form" onSubmit={handleSubmit}>
      <label>
        Titulo
        <input value={title} onChange={(event) => setTitle(event.target.value)} />
      </label>
      <label>
        Categoria
        <select value={category} onChange={(event) => setCategory(event.target.value)}>
          <option>Nuevo</option>
          <option>Color</option>
          <option>Alisado</option>
          <option>Canas</option>
          <option>Antes y despues</option>
        </select>
      </label>
      <label>
        Cliente
        <input value={customerName} onChange={(event) => setCustomerName(event.target.value)} />
      </label>
      <label>
        Fecha del trabajo
        <input
          type="date"
          value={completedAt}
          onChange={(event) => setCompletedAt(event.target.value)}
        />
      </label>
      <label>
        Foto antes URL
        <input
          value={beforeImageUrl}
          onChange={(event) => setBeforeImageUrl(event.target.value)}
        />
      </label>
      <label>
        Foto despues URL
        <input
          value={afterImageUrl}
          onChange={(event) => setAfterImageUrl(event.target.value)}
        />
      </label>
      <label>
        Notas
        <textarea value={notes} onChange={(event) => setNotes(event.target.value)} />
      </label>
      {error ? <p className="form-error">{error}</p> : null}
      <div className="form-actions">
        <button type="submit" disabled={isSaving}>
          {isSaving ? "Guardando..." : work ? "Actualizar trabajo" : "Guardar trabajo"}
        </button>
        {work ? (
          <button type="button" className="secondary-button" onClick={onCancelEdit}>
            Cancelar edicion
          </button>
        ) : null}
      </div>
    </form>
  );
}

function OfferForm({
  offer,
  onCancelEdit,
  onSaved,
}: {
  offer: Offer | null;
  onCancelEdit: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(offer?.title ?? "");
  const [description, setDescription] = useState(offer?.description ?? "");
  const [priceLabel, setPriceLabel] = useState(offer?.priceLabel ?? "");
  const [startsOn, setStartsOn] = useState(offer?.startsOn ?? "");
  const [endsOn, setEndsOn] = useState(offer?.endsOn ?? "");
  const [isActive, setIsActive] = useState(offer?.isActive ?? true);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError("");

    const response = await fetch(offer ? `/api/offers/${offer.id}` : "/api/offers", {
      method: offer ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description, priceLabel, startsOn, endsOn, isActive }),
    });

    setIsSaving(false);

    if (!response.ok) {
      const payload = await response.json();
      setError(payload.message ?? "No se pudo guardar la oferta.");
      return;
    }

    onSaved();
  }

  return (
    <form className="appointment-form" onSubmit={handleSubmit}>
      <label>
        Titulo
        <input value={title} onChange={(event) => setTitle(event.target.value)} />
      </label>
      <label>
        Descripcion
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </label>
      <label>
        Precio o texto promocional
        <input value={priceLabel} onChange={(event) => setPriceLabel(event.target.value)} />
      </label>
      <label>
        Desde
        <input type="date" value={startsOn} onChange={(event) => setStartsOn(event.target.value)} />
      </label>
      <label>
        Hasta
        <input type="date" value={endsOn} onChange={(event) => setEndsOn(event.target.value)} />
      </label>
      <label className="checkbox-label">
        <input
          checked={isActive}
          type="checkbox"
          onChange={(event) => setIsActive(event.target.checked)}
        />
        Oferta activa
      </label>
      {error ? <p className="form-error">{error}</p> : null}
      <div className="form-actions">
        <button type="submit" disabled={isSaving}>
          {isSaving ? "Guardando..." : offer ? "Actualizar oferta" : "Guardar oferta"}
        </button>
        {offer ? (
          <button type="button" className="secondary-button" onClick={onCancelEdit}>
            Cancelar edicion
          </button>
        ) : null}
      </div>
    </form>
  );
}
