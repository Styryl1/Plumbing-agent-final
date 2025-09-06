import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
	// i18n configuration handled by next-intl plugin
	// Uses App Router with server-side locale detection
};

export default withNextIntl(nextConfig);