import WorkspacePlaceholder from '../placeholder';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Agentes · KitZ',
};

export default function AgentesPage() {
  return (
    <WorkspacePlaceholder
      command="kitz agents"
      title="Agentes"
      description="Configura agentes, prompts, herramientas y permisos."
      shippingIn="Phase 3 · Module 9"
    />
  );
}
