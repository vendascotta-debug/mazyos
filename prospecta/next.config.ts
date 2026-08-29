import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // node:sqlite é builtin do Node 24 — mantido fora do bundle do servidor.
  serverExternalPackages: [],
  experimental: {
    // rotas de API tocam o filesystem (data/prospecta.db); nada de edge runtime.
  },
};

export default nextConfig;
