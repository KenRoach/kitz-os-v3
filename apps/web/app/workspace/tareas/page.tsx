import WorkspacePlaceholder from '../placeholder';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Tareas · KitZ' };

export default function TareasPage() {
  return (
    <WorkspacePlaceholder
      command="kitz tasks"
      title="Tareas"
      description="Lista de pendientes del espacio con prioridades y asignados."
      shippingIn="Backlog (no incluido en BOOTSTRAP-PROMPT v3 inicial)"
    />
  );
}
