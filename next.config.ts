import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  eslint: {
    // Deshabilitar ESLint durante el build para evitar errores de archivos generados
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
