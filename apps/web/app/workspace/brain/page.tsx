import WorkspacePlaceholder from '../placeholder';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Cerebro · KitZ' };

export default function BrainOverviewPage() {
  return (
    <WorkspacePlaceholder
      command="kitz brain status"
      title="Cerebro"
      description="Estado del cerebro: créditos IA, modelos activos, agentes y conocimiento."
      shippingIn="Phase 3 · Module 9 (próximo commit)"
    />
  );
}
