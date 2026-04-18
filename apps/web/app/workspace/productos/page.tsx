import WorkspacePlaceholder from '../placeholder';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Productos · KitZ' };

export default function ProductosPage() {
  return (
    <WorkspacePlaceholder
      command="kitz catalog"
      title="Productos"
      description="Catálogo: SKUs, precios, inventario y categorías."
      shippingIn="Backlog (no incluido en BOOTSTRAP-PROMPT v3 inicial)"
    />
  );
}
