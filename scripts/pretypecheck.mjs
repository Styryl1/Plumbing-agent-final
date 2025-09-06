#!/usr/bin/env node
import { existsSync, mkdirSync, writeFileSync } from "node:fs";

if (!existsSync(".next/types/routes.d.ts")) {
	mkdirSync(".next/types", { recursive: true });
	writeFileSync(".next/types/routes.d.ts", "export {};\n");
}
