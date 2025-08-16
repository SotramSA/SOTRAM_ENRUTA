import { redirect } from 'next/navigation';

export default function TurnosRedirect() {
  // Redirige automáticamente a la ruta existente en singular
  redirect('/turno');
}
