import Sidebar from "@/src/components/Sidebar";

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <>
            <div className="md:flex">
                <Sidebar/>
                <main className="flex-1 md:ml-60">
                    {children}
                </main>
            </div>
        </>
    );
}
