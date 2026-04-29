"use client";

import { FormEvent, useEffect, useState } from "react";

type Service = {
  id: number;
  name: string;
  description: string | null;
  priceCents: number;
  durationMinutes: number;
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

type PublicData = {
  services: Service[];
  works: Work[];
  offers: Offer[];
};

function formatMoney(cents: number) {
  return new Intl.NumberFormat("es-CR", {
    style: "currency",
    currency: "CRC",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function ClientPortal() {
  const [data, setData] = useState<PublicData>({
    services: [],
    works: [],
    offers: [],
  });
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/public", { signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.message ?? "No se pudo cargar el portal.");
        }

        setData(payload);
        setError("");
      })
      .catch((caughtError) => {
        if (caughtError instanceof DOMException && caughtError.name === "AbortError") {
          return;
        }

        setError(caughtError instanceof Error ? caughtError.message : "Error inesperado.");
      });

    return () => controller.abort();
  }, []);

  const activeOffers = data.offers.filter((offer) => offer.isActive);

  return (
    <main className="client-shell">
      <section className="client-hero">
        <div>
          <p className="eyebrow">Salon de belleza</p>
          <h1>Servicios, trabajos y ofertas</h1>
          <p>
            Aqui la clienta ve informacion publica del salon sin acceso a clientes, agenda
            interna ni datos administrativos.
          </p>
        </div>
      </section>

      {error ? (
        <section className="system-message">
          <h2>No se pudo cargar el portal</h2>
          <p>{error}</p>
        </section>
      ) : null}

      <ClientBookingForm services={data.services} />

      <section className="client-section">
        <div className="section-heading">
          <div>
            <h2>Ofertas activas</h2>
            <p>Promociones disponibles para consultar con el salon.</p>
          </div>
        </div>
        <div className="offer-grid">
          {activeOffers.length === 0 ? (
            <p className="empty-state">No hay ofertas activas por ahora.</p>
          ) : (
            activeOffers.map((offer) => (
              <article className="offer-card" key={offer.id}>
                <span>{offer.priceLabel}</span>
                <h3>{offer.title}</h3>
                <p>{offer.description}</p>
              </article>
            ))
          )}
        </div>
      </section>

      <section className="client-section">
        <div className="section-heading">
          <div>
            <h2>Servicios</h2>
            <p>Precios aproximados porque cada cabello y proceso puede variar.</p>
          </div>
        </div>
        <div className="service-grid">
          {data.services.map((service) => (
            <article className="service-card" key={service.id}>
              <div>
                <h3>{service.name}</h3>
                <p>{service.description ?? "Consulta detalles con el salon."}</p>
              </div>
              <div className="service-card-footer">
                <span>{service.durationMinutes} min aprox.</span>
                <strong>Desde {formatMoney(service.priceCents)}</strong>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="client-section">
        <div className="section-heading">
          <div>
            <h2>Trabajos</h2>
            <p>Referencias de color, alisados, canas y antes/despues.</p>
          </div>
        </div>
        <div className="category-grid">
          {data.works.length === 0 ? (
            <p className="empty-state">Aun no hay trabajos publicados.</p>
          ) : (
            data.works.map((work) => (
              <article className="category-card" key={work.id}>
                <span>{work.category}</span>
                <h3>{work.title}</h3>
                {work.notes ? <p>{work.notes}</p> : null}
              </article>
            ))
          )}
        </div>
      </section>
    </main>
  );
}

function ClientBookingForm({ services }: { services: Service[] }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const selectedServiceId = serviceId || services[0]?.id.toString() || "";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError("");
    setMessage("");

    const response = await fetch("/api/public/appointments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        phone,
        serviceId: selectedServiceId,
        startsAt,
        notes,
      }),
    });

    setIsSaving(false);

    if (!response.ok) {
      const payload = await response.json();
      setError(payload.message ?? "No se pudo solicitar la cita.");
      return;
    }

    setStartsAt("");
    setNotes("");
    setMessage("Cita solicitada. El salon puede verla en el panel admin.");
  }

  return (
    <section className="client-section booking-panel">
      <div className="section-heading">
        <div>
          <h2>Solicitar cita</h2>
          <p>
            Por ahora pedimos tus datos aqui. Cuando agreguemos login, esta informacion saldra
            de tu perfil.
          </p>
        </div>
      </div>

      <form className="appointment-form client-booking-form" onSubmit={handleSubmit}>
        <label>
          Nombre
          <input value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <label>
          Telefono
          <input value={phone} onChange={(event) => setPhone(event.target.value)} />
        </label>
        <label>
          Servicio
          <select
            value={selectedServiceId}
            onChange={(event) => setServiceId(event.target.value)}
          >
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
            placeholder="Ejemplo: quiero valorar color o enviar referencia"
          />
        </label>
        {error ? <p className="form-error">{error}</p> : null}
        {message ? <p className="form-success">{message}</p> : null}
        <button type="submit" disabled={isSaving || services.length === 0}>
          {isSaving ? "Enviando..." : "Solicitar cita"}
        </button>
      </form>
    </section>
  );
}
