import WorkspacePlaceholder from '../../placeholder';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Conocimiento · KitZ' };

export default function ConocimientoPage() {
  return (
    <WorkspacePlaceholder
      command="kitz knowledge"
      title="Conocimiento"
      description="Base de conocimiento: skills, fragmentos, embeddings y búsqueda semántica."
      shippingIn="Phase 3 · Module 10"
    />
  );
}
