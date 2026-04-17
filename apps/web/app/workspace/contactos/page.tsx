import WorkspacePlaceholder from '../placeholder';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Contactos · KitZ',
};

export default function ContactosPage() {
  return (
    <WorkspacePlaceholder
      command="kitz crm"
      title="Contactos"
      description="Gestiona contactos, empresas, etiquetas y actividad."
      shippingIn="Phase 2 · Module 7"
    />
  );
}
