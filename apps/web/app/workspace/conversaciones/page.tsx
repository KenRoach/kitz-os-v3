import WorkspacePlaceholder from '../placeholder';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Conversaciones · KitZ',
};

export default function ConversacionesPage() {
  return (
    <WorkspacePlaceholder
      command="kitz inbox"
      title="Conversaciones"
      description="Mensajes entrantes, borradores de respuesta y canales conectados."
      shippingIn="Phase 3 · Module 11 (WhatsApp + drafts)"
    />
  );
}
