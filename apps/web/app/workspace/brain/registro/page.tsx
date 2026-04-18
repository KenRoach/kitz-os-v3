import WorkspacePlaceholder from '../../placeholder';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Registro · KitZ' };

export default function RegistroPage() {
  return (
    <WorkspacePlaceholder
      command="kitz brain logs"
      title="Registro"
      description="Trazas de cada llamada al LLM (Langfuse): input, output, modelo, latencia."
      shippingIn="Phase 3 (después de Modules 9 + 10)"
    />
  );
}
