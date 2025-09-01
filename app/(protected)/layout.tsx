import Sidebar from "@/src/components/Sidebar";
import SessionChecker from "@/src/components/SessionChecker";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

// Configuración para evitar prerenderizado de páginas protegidas
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    // Verificar autenticación básica en el servidor
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');
    
    // Si no hay sesión, redirigir al login
    if (!sessionCookie) {
        redirect('/login');
    }

    return (
        <>
            <SessionChecker />
            <div className="md:flex">
                <Sidebar/>
                <main className="flex-1 md:ml-60">
                    {children}
                </main>
            </div>
        </>
    );
}
