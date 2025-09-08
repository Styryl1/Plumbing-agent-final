import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
	// i18n configuration handled by next-intl plugin
	// Uses App Router with server-side locale detection
	
	// Performance optimizations
	images: {
		formats: ['image/webp', 'image/avif'],
		dangerouslyAllowSVG: true,
		contentDispositionType: 'attachment',
		contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
	},
	
	// Compression
	compress: true,
	
	// Bundle analyzer in dev mode
	experimental: {
		optimizePackageImports: [
			'@heroicons/react',
			'lucide-react',
			'date-fns'
		],
	},
	
	// Turbopack configuration (moved from experimental.turbo)
	turbopack: {
		rules: {
			'*.svg': {
				loaders: ['@svgr/webpack'],
				as: '*.js',
			},
		},
	},
	
	// Headers for performance and security
	async headers() {
		return [
			{
				source: '/(.*)',
				headers: [
					{
						key: 'X-DNS-Prefetch-Control',
						value: 'on'
					},
					{
						key: 'Strict-Transport-Security',
						value: 'max-age=63072000; includeSubDomains; preload'
					},
					{
						key: 'X-Content-Type-Options',
						value: 'nosniff'
					},
					{
						key: 'Referrer-Policy',
						value: 'strict-origin-when-cross-origin'
					}
				]
			},
			{
				source: '/nl/launch',
				headers: [
					{
						key: 'Link',
						value: '</nl/launch/demo>; rel=prefetch'
					}
				]
			},
			{
				source: '/en/launch',
				headers: [
					{
						key: 'Link',
						value: '</en/launch/demo>; rel=prefetch'
					}
				]
			}
		];
	}
};

export default withNextIntl(nextConfig);