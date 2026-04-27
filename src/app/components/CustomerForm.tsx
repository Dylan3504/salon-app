"use client";

import { FormEvent, useState } from "react";

type Customer = {
  id: number;
  name: string;
  phone: string;
  notes: string | null;
};

type CustomerFormProps = {
  onSaved: () => void;
  customer?: Customer | null;
  onCancelEdit?: () => void;
};

export function CustomerForm({ onSaved, customer, onCancelEdit }: CustomerFormProps) {
  const [name, setName] = useState(customer?.name ?? "");
  const [phone, setPhone] = useState(customer?.phone ?? "");
  const [notes, setNotes] = useState(customer?.notes ?? "");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const isEditing = Boolean(customer);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError("");

    const response = await fetch(customer ? `/api/customers/${customer.id}` : "/api/customers", {
      method: customer ? "PATCH" : "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        phone,
        notes,
      }),
    });

    setIsSaving(false);

    if (!response.ok) {
      const payload = await response.json();
      setError(payload.message ?? "No se pudo crear el cliente.");
      return;
    }

    setName("");
    setPhone("");
    setNotes("");
    onSaved();
  }

  return (
    <form className="appointment-form" onSubmit={handleSubmit}>
      <label>
        Nombre
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Ejemplo: Ana Martinez"
        />
      </label>

      <label>
        Telefono
        <input
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          placeholder="Ejemplo: 8888-0000"
        />
      </label>

      <label>
        Notas
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Preferencias, alergias o detalles importantes"
        />
      </label>

      {error ? <p className="form-error">{error}</p> : null}

      <div className="form-actions">
        <button type="submit" disabled={isSaving}>
          {isSaving ? "Guardando..." : isEditing ? "Actualizar cliente" : "Guardar cliente"}
        </button>
        {isEditing ? (
          <button type="button" className="secondary-button" onClick={onCancelEdit}>
            Cancelar edicion
          </button>
        ) : null}
      </div>
    </form>
  );
}
