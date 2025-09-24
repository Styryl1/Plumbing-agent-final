declare module "ipaddr.js" {
	export type IPv4 = {
		kind(): "ipv4";
		toNormalizedString(): string;
		match(range: [IPv4 | IPv6, number]): boolean;
	};

	export type IPv6 = {
		kind(): "ipv6";
		toNormalizedString(): string;
		match(range: [IPv4 | IPv6, number]): boolean;
	};

	export function parse(address: string): IPv4 | IPv6;
	export function parseCIDR(range: string): [IPv4 | IPv6, number];
}
