import type { MetadataRoute } from "next";

// Sistema interno: nada deve aparecer em buscadores
export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: "*", disallow: "/" }] };
}
