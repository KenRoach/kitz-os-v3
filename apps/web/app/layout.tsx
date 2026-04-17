import type { ReactNode } from 'react';
import './globals.css';

export const metadata = {
  title: 'KitZ',
  description: 'KitZ es el sistema operativo que pone la IA a trabajar en tu negocio',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
