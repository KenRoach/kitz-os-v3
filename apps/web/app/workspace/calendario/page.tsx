import WorkspacePlaceholder from '../placeholder';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Calendario · KitZ' };

export default function CalendarioPage() {
  return (
    <WorkspacePlaceholder
      command="kitz calendar"
      title="Calendario"
      description="Eventos, citas y disponibilidad. Conexión con Google Calendar."
      shippingIn="Phase 4 · Module 12"
    />
  );
}
