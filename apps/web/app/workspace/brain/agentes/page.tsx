import WorkspacePlaceholder from '../../placeholder';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Agentes · KitZ' };

export default function AgentesPage() {
  return (
    <WorkspacePlaceholder
      command="kitz agents"
      title="Agentes"
      description="Constructor de agentes: nombre, prompt, modelo, herramientas, permisos."
      shippingIn="Phase 3 · Module 9 (próximo commit)"
    />
  );
}
