import WorkspacePlaceholder from '../../placeholder';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Plantillas · KitZ' };

export default function PlantillasPage() {
  return (
    <WorkspacePlaceholder
      command="kitz canvas templates"
      title="Plantillas"
      description="Plantillas de documento: cotizaciones, propuestas, contratos."
      shippingIn="Phase 4 · Module 13"
    />
  );
}
