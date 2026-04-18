import WorkspacePlaceholder from '../../placeholder';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Skills · KitZ' };

export default function SkillsPage() {
  return (
    <WorkspacePlaceholder
      command="kitz skills builder"
      title="Skills"
      description="Bloques reusables que los agentes pueden invocar: prompts compuestos, herramientas encadenadas, plantillas de respuesta."
      shippingIn="Phase 3 · Module 10 (próximo a Conocimiento)"
    />
  );
}
