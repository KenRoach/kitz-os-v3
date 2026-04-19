import DocumentosClient from './documentos-client';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Documentos · KitZ' };

export default function DocumentosPage() {
  return <DocumentosClient />;
}
