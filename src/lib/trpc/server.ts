import { useTranslations } from "next-intl";
import "server-only";

import { cache } from "react";

import { createCaller } from "~/server/api/root";
import { createContext } from "~/server/api/trpc";

const createContextCached = cache(createContext);

export const api = createCaller(createContextCached);
