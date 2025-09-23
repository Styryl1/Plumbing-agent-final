import { notFound } from "next/navigation";
import type { JSX } from "react";
import { JobCardClient } from "~/app/p/job/[token]/client";
import { api } from "~/lib/trpc/server";

interface JobCardPageProps {
	readonly params: { id: string };
}

export default async function JobCardPage({
	params,
}: JobCardPageProps): Promise<JSX.Element> {
	try {
		const job = await api.jobCard.getByJobId({ jobId: params.id });
		return <JobCardClient initialJob={job} />;
	} catch (error) {
		console.error("[job-card] staff view failed", error);
		notFound();
	}
}
