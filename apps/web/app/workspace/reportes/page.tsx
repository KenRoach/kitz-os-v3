import WorkspacePlaceholder from '../placeholder';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Reportes · KitZ' };

export default function ReportesPage() {
  return (
    <WorkspacePlaceholder
      command="kitz reports"
      title="Reportes"
      description="Resúmenes de ventas, conversión, actividad y uso de IA."
      shippingIn="Backlog (no incluido en BOOTSTRAP-PROMPT v3 inicial)"
    />
  );
}
