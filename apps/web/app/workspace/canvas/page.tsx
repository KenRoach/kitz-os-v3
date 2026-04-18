import WorkspacePlaceholder from '../placeholder';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Canvas · KitZ' };

export default function CanvasGalleryPage() {
  return (
    <WorkspacePlaceholder
      command="kitz canvas gallery"
      title="Canvas"
      description="Cotizaciones, reportes, diseños y otros artefactos generados."
      shippingIn="Phase 4 · Module 13 (cotizador) y Module 15 (OCR)"
    />
  );
}
