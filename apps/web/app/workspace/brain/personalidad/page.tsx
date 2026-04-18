import WorkspacePlaceholder from '../../placeholder';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Personalidad · KitZ' };

export default function PersonalidadPage() {
  return (
    <WorkspacePlaceholder
      command="kitz brain personality"
      title="Personalidad"
      description="Tono, idioma, persona y temas vetados de Kitz."
      shippingIn="Phase 3 · Module 9 (próximo commit)"
    />
  );
}
