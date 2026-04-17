import WorkspacePlaceholder from '../placeholder';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Ajustes · KitZ',
};

export default function AjustesPage() {
  return (
    <WorkspacePlaceholder
      command="kitz settings"
      title="Ajustes"
      description="Espacio, miembros, API keys, integraciones y tema."
      shippingIn="Phase 5 · Module 17"
    />
  );
}
