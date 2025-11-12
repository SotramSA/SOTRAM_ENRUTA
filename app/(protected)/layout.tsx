import Sidebar from "@/src/components/Sidebar";
import SessionChecker from "@/src/components/SessionChecker";

// Configuración para evitar prerenderizado de páginas protegidas
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    // La verificación y redirección de sesión se maneja en middleware.
    // Evitamos redirecciones en el layout del App Router para que el build
    // no intente recolectar datos de páginas protegidas y falle.

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
