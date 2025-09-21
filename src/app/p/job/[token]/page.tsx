import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { JSX } from "react";
import { api } from "~/lib/trpc/server";
import { JobCardClient } from "./client";

interface PageProps {
	readonly params: {
		readonly token: string;
	};
}

export const metadata: Metadata = {
	title: "Jobkaart",
	robots: {
		index: false,
		follow: false,
	},
};

export default async function JobCardPage({
	params,
}: PageProps): Promise<JSX.Element> {
	try {
		const job = await api.jobCard.getByToken({ token: params.token });
		return <JobCardClient initialJob={job} />;
	} catch (error) {
		console.error("[job-card] token view failed", error);
		notFound();
	}
}
