"use client";

import { FormEvent, useState } from "react";

type CustomerFormProps = {
  onSaved: () => void;
};

export function CustomerForm({ onSaved }: CustomerFormProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError("");

    const response = await fetch("/api/customers", {
      method: "POST",
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

      <button type="submit" disabled={isSaving}>
        {isSaving ? "Guardando..." : "Guardar cliente"}
      </button>
    </form>
  );
}
