"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Key, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { JSX } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "~/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { useT } from "~/i18n/client";
import { api } from "~/lib/trpc/client";

// Form schema with Zod v4 patterns
const WeFactSetupSchema = z.object({
	apiKey: z.string().min(10, { error: "API sleutel te kort" }),
	baseUrl: z.url().optional(),
});

type WeFactSetupForm = z.infer<typeof WeFactSetupSchema>;

export default function WeFactSetupPage(): JSX.Element {
	const router = useRouter();
	const t = useT("providers");
	const tForm = useT("providers.setup");

	const form = useForm<WeFactSetupForm>({
		resolver: zodResolver(WeFactSetupSchema),
		defaultValues: {
			apiKey: "",
			baseUrl: "https://api.mijnwefact.nl/v2/",
		},
	});

	const connectMutation = api.providers.connectWithApiKey.useMutation({
		onSuccess: () => {
			router.push("/settings/providers");
		},
	});

	const onSubmit = (data: WeFactSetupForm): void => {
		connectMutation.mutate({
			provider: "wefact",
			access_token: data.apiKey,
			baseUrl: data.baseUrl,
			scopes: [],
		});
	};

	return (
		<div className="container mx-auto max-w-2xl py-8">
			<div className="mb-6">
				<Link
					href="/settings/providers"
					className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
				>
					<ArrowLeft className="mr-2 h-4 w-4" />
					{t("actions.back")}
				</Link>
			</div>

			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-3">
						<Key className="h-6 w-6 text-blue-600" />
						{tForm("wefact.title")}
					</CardTitle>
					<CardDescription>{tForm("wefact.description")}</CardDescription>
				</CardHeader>
				<CardContent>
					<Form {...form}>
						<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
							<FormField
								control={form.control}
								name="apiKey"
								render={({ field }) => (
									<FormItem>
										<FormLabel>{tForm("apiKey.label")}</FormLabel>
										<FormControl>
											<Input
												type="password"
												placeholder={tForm("apiKey.placeholder")}
												{...field}
											/>
										</FormControl>
										<FormDescription>{tForm("apiKey.help")}</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="baseUrl"
								render={({ field }) => (
									<FormItem>
										<FormLabel>{tForm("baseUrl.label")}</FormLabel>
										<FormControl>
											<Input
												type="url"
												placeholder="https://api.mijnwefact.nl/v2/"
												{...field}
											/>
										</FormControl>
										<FormDescription>{tForm("baseUrl.help")}</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>

							<div className="flex gap-3">
								<Button
									type="submit"
									disabled={connectMutation.isPending}
									className="flex-1"
								>
									{connectMutation.isPending && (
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									)}
									{connectMutation.isPending
										? tForm("actions.connecting")
										: tForm("actions.connect")}
								</Button>
								<Button asChild variant="outline">
									<Link href="/settings/providers">
										{tForm("actions.cancel")}
									</Link>
								</Button>
							</div>

							{connectMutation.error && (
								<div className="rounded-md bg-red-50 p-3 text-sm text-red-800">
									{tForm("errors.connection")}: {connectMutation.error.message}
								</div>
							)}
						</form>
					</Form>
				</CardContent>
			</Card>
		</div>
	);
}
