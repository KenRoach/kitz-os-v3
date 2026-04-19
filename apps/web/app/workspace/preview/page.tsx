import KitzPrototype from '../kitz-workspace-proto';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Preview · KitZ' };

/**
 * Live preview of the Japandi redesign target. Self-contained component
 * with hardcoded data — useful for comparing against the wired routes
 * while we port the visual language across the rest of the app.
 *
 * Visit: /workspace/preview
 */
export default function PreviewPage() {
  return <KitzPrototype />;
}
