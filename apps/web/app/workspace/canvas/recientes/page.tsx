import WorkspacePlaceholder from '../../placeholder';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Recientes · KitZ' };

export default function RecientesPage() {
  return (
    <WorkspacePlaceholder
      command="kitz canvas recent"
      title="Recientes"
      description="Últimos documentos editados o generados por IA."
      shippingIn="Phase 4 · Module 13"
    />
  );
}
