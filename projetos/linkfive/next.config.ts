import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Avatar e foto de produto entram por URL colada no MVP (ver arquitetura,
    // secao 11). Sem allowlist de dominio o next/image recusaria essas URLs,
    // entao a pagina publica usa <img> normal e o Next nao precisa otimizar.
    unoptimized: true,
  },
};

export default nextConfig;
