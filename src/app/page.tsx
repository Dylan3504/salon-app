import Link from "next/link";

export default function Home() {
  return (
    <main className="entry-shell">
      <section>
        <p className="eyebrow">Salon de belleza</p>
        <h1>Elige como quieres entrar</h1>
        <p>
          Esta pantalla es temporal mientras construimos login. La vista de admin es para la
          duena del salon y la vista de clienta muestra solo informacion publica y personal.
        </p>
        <div className="entry-actions">
          <Link className="entry-card" href="/admin">
            <span>Admin</span>
            <strong>Gestionar salon</strong>
            <small>Agenda, clientes, servicios, trabajos y ofertas.</small>
          </Link>
          <Link className="entry-card" href="/client">
            <span>Clienta</span>
            <strong>Ver servicios y ofertas</strong>
            <small>Portal sin acceso a la lista de clientes ni agenda interna.</small>
          </Link>
        </div>
      </section>
    </main>
  );
}
