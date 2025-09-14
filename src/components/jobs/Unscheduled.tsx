"use client";
import { Clock, Gauge, Phone, Zap } from "lucide-react";
import { useTranslations } from "next-intl";
import type { JSX } from "react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "~/components/ui/select";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "~/components/ui/sheet";
import { Skeleton } from "~/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Textarea } from "~/components/ui/textarea";
import {
	businessHoursStart,
	snapTo15Min,
	TZ,
	toISO,
} from "~/lib/calendar-temporal";
import { formatDutchDate, formatDutchDateTime } from "~/lib/dates";
import { api } from "~/lib/trpc/client";

type JobPriority = "normal" | "urgent" | "emergency";

interface Employee {
	id: string;
	name: string;
	color?: string | null;
}

interface UnscheduledProps {
	readonly employees: Employee[];
	readonly onJobCreated?: () => void;
}

interface AiRecommendationDTO {
	id: string;
	createdIso: string;
	title: string;
	summary?: string;
	confidence: number;
	customer?: { name?: string; phoneE164?: string };
	estimate?: {
		durationMinutes?: number;
		materials?: Array<{ name: string; qty: number; unit?: string }>;
	};
	media?: string[];
	urgency: "low" | "medium" | "high";
	tags: string[];
	source: "rule" | "openai";
}

interface WhatsAppLead {
	id: string;
	phone_e164: string;
	wa_name: string | null;
	wa_chat_id: string | null;
	customer_id: string | null;
	first_seen_at: string;
	last_seen_at: string;
	message_count: number;
	created_at: string;
	updated_at: string;
}

export default function Unscheduled({
	employees,
	onJobCreated,
}: UnscheduledProps): JSX.Element {
	const t = useTranslations();
	const [isOpen, setIsOpen] = useState(false);
	const [activeRecommendation, setActiveRecommendation] =
		useState<AiRecommendationDTO | null>(null);
	const [activeWhatsAppLead, setActiveWhatsAppLead] =
		useState<WhatsAppLead | null>(null);

	// Fetch AI recommendations
	const { data: aiData, isLoading: aiLoading } =
		api.ai.listRecommendations.useQuery({ limit: 25 }, { enabled: isOpen });
	const aiRecommendations = aiData?.items ?? [];

	// Fetch WhatsApp leads
	const { data: whatsappLeads = [] } = api.whatsapp.listLeads.useQuery(
		{ limit: 10 },
		{ enabled: isOpen },
	) as { data: WhatsAppLead[] };

	// Form state for job creation
	const [formData, setFormData] = useState<{
		title: string;
		description: string;
		priority: JobPriority;
		duration: number;
		startTime: string;
		primaryEmployeeId: string;
		secondaryEmployeeIds: string[];
		customerId: string;
	}>({
		title: "",
		description: "",
		priority: "normal",
		duration: 60,
		startTime: "",
		primaryEmployeeId: "",
		secondaryEmployeeIds: [],
		customerId: "",
	});

	const createJobMutation = api.jobs.create.useMutation({
		onSuccess: () => {
			toast.success("Klus aangemaakt");
			setIsOpen(false);
			resetForm();
			onJobCreated?.();
		},
		onError: (error) => {
			toast.error("Fout bij aanmaken klus: " + error.message);
		},
	});

	const resetForm = (): void => {
		setFormData({
			title: "",
			description: "",
			priority: "normal",
			duration: 60,
			startTime: "",
			primaryEmployeeId: "",
			secondaryEmployeeIds: [],
			customerId: "",
		});
		setActiveRecommendation(null);
		setActiveWhatsAppLead(null);
	};

	const handleApplyAIRecommendation = (rec: AiRecommendationDTO): void => {
		setActiveRecommendation(rec);
		// Map AI recommendation to form data
		setFormData((prev) => ({
			...prev,
			title: rec.title,
			description: rec.summary ?? "",
			priority:
				rec.urgency === "high"
					? "emergency"
					: rec.urgency === "medium"
						? "urgent"
						: "normal",
			duration: rec.estimate?.durationMinutes ?? 60,
			customerId: "", // Will need customer picker integration
		}));
	};

	const handleApplyWhatsAppLead = (lead: WhatsAppLead): void => {
		setActiveWhatsAppLead(lead);
		setFormData((prev) => ({
			...prev,
			title: `WhatsApp: ${lead.wa_name ?? lead.phone_e164}`,
			description: `Contact via WhatsApp - ${lead.message_count} ${t("whatsapp.messages")}`,
			customerId: lead.customer_id ?? "",
		}));
	};

	const handleSubmit = async (): Promise<void> => {
		if (
			!formData.title ||
			!formData.startTime ||
			!formData.primaryEmployeeId ||
			!formData.customerId
		) {
			toast.error("Vul alle verplichte velden in");
			return;
		}

		try {
			// Parse local datetime and convert to Amsterdam timezone
			const localDateTime = Temporal.PlainDateTime.from(formData.startTime);
			const startZdt = localDateTime.toZonedDateTime(TZ);
			const snappedStart = snapTo15Min(startZdt);
			const endZdt = snappedStart.add({ minutes: formData.duration });

			await createJobMutation.mutateAsync({
				title: formData.title,
				description: formData.description || undefined,
				start: toISO(snappedStart),
				end: toISO(endZdt),
				customerId: formData.customerId,
				address: {
					postalCode: "",
					houseNumber: "",
					addition: "",
					street: "",
					city: "",
				},
				employeeId: formData.primaryEmployeeId || undefined,
			});
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : String(error);
			console.error("Error creating job:", message);
		}
	};

	const getNextAvailableSlot = (): string => {
		const now = Temporal.Now.zonedDateTimeISO(TZ);
		const todayStart = businessHoursStart(now.toPlainDate());
		const nowMs = now.toInstant().epochMilliseconds;
		const startMs = todayStart.toInstant().epochMilliseconds;
		const nextSlot =
			nowMs > startMs ? snapTo15Min(now.add({ minutes: 30 })) : todayStart;

		return nextSlot.toPlainDateTime().toString().slice(0, 16); // Format for datetime-local
	};

	return (
		<Sheet open={isOpen} onOpenChange={setIsOpen}>
			<SheetTrigger asChild>
				<Button
					className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50"
					size="icon"
					data-testid="unscheduled-open"
				>
					<Zap className="h-6 w-6" />
					<span className="sr-only">{t("actions.cta.newJob")}</span>
				</Button>
			</SheetTrigger>

			<SheetContent
				side="bottom"
				className="h-[80vh] rounded-t-lg"
				data-testid="unscheduled-list"
			>
				<SheetHeader>
					<SheetTitle>{t("actions.cta.newJob")}</SheetTitle>
				</SheetHeader>

				<div className="flex-1 overflow-hidden">
					<Tabs defaultValue="ai" className="h-full flex flex-col">
						<TabsList className="grid w-full grid-cols-2 mb-4">
							<TabsTrigger value="ai">
								{t("jobs.unscheduled.ai.title")}{" "}
								{aiRecommendations.length > 0 && (
									<span className="ml-1 text-xs opacity-70">
										({aiRecommendations.length})
									</span>
								)}
							</TabsTrigger>
							<TabsTrigger value="whatsapp">
								{t("ui.tabs.whatsapp")}
							</TabsTrigger>
						</TabsList>

						{/* AI Recommendations Tab */}
						<TabsContent value="ai" className="flex-1 overflow-y-auto">
							<div className="space-y-3">
								{aiLoading ? (
									<div className="space-y-3">
										{[1, 2, 3].map((i) => (
											<Skeleton key={i} className="h-32 w-full" />
										))}
									</div>
								) : aiRecommendations.length === 0 ? (
									<div className="text-center py-8 text-gray-500">
										<p>{t("jobs.unscheduled.ai.empty")}</p>
									</div>
								) : (
									aiRecommendations.map((rec) => (
										<div
											key={rec.id}
											className="border rounded-lg p-4 space-y-3 hover:bg-gray-50 transition-colors"
										>
											<div className="flex items-start justify-between gap-3">
												<div className="flex-1 min-w-0">
													<h3 className="font-medium text-sm truncate">
														{rec.title}
													</h3>
													{rec.summary && (
														<p className="text-gray-600 text-xs mt-1 line-clamp-2">
															{rec.summary}
														</p>
													)}
												</div>
												<div className="flex flex-col gap-1 items-end">
													<Badge
														variant={
															rec.confidence >= 80
																? "default"
																: rec.confidence >= 60
																	? "secondary"
																	: "outline"
														}
														className="text-xs"
													>
														<Gauge className="h-3 w-3 mr-1" />
														{rec.confidence}%
													</Badge>
													{rec.urgency === "high" && (
														<Badge variant="destructive" className="text-xs">
															{t("ui.form.priorityOptions.urgent")}
														</Badge>
													)}
												</div>
											</div>

											<div className="flex flex-wrap gap-3 text-xs text-gray-500">
												{rec.customer?.phoneE164 && (
													<div className="flex items-center gap-1">
														<Phone className="h-3 w-3" />
														<span>{rec.customer.phoneE164}</span>
													</div>
												)}
												{rec.estimate?.durationMinutes && (
													<div className="flex items-center gap-1">
														<Clock className="h-3 w-3" />
														<span>
															{rec.estimate.durationMinutes}{" "}
															{t("jobs.unscheduled.ai.minutes")}
														</span>
													</div>
												)}
												<div className="flex items-center gap-1">
													<span>{formatDutchDate(rec.createdIso)}</span>
												</div>
											</div>

											{rec.tags.length > 0 && (
												<div className="flex flex-wrap gap-1">
													{rec.tags.map((tag) => (
														<Badge
															key={tag}
															variant="outline"
															className="text-xs py-0 px-1"
														>
															{tag}
														</Badge>
													))}
												</div>
											)}

											<Button
												onClick={() => {
													handleApplyAIRecommendation(rec);
												}}
												variant="outline"
												size="sm"
												className="w-full"
											>
												{t("jobs.unscheduled.ai.assign")}
											</Button>
										</div>
									))
								)}
							</div>
						</TabsContent>

						{/* WhatsApp Leads Tab */}
						<TabsContent value="whatsapp" className="flex-1 overflow-y-auto">
							<div className="space-y-3">
								{whatsappLeads.length === 0 ? (
									<div className="text-center py-8 text-gray-500">
										<p>{t("whatsapp.noMessages")}</p>
									</div>
								) : (
									whatsappLeads.map((lead) => (
										<div
											key={lead.id}
											className="border rounded-lg p-4 space-y-3"
										>
											<div className="flex items-start justify-between">
												<div className="flex-1">
													<h3 className="font-medium text-sm">
														{lead.wa_name ?? lead.phone_e164}
													</h3>
													<p className="text-gray-600 text-xs mt-1">
														{lead.message_count} {t("whatsapp.messages")}
													</p>
												</div>
											</div>

											<div className="text-xs text-gray-500">
												{t("whatsapp.lastActivity")}:{" "}
												{formatDutchDateTime(lead.last_seen_at)}
											</div>

											<Button
												onClick={() => {
													handleApplyWhatsAppLead(lead);
												}}
												variant="outline"
												size="sm"
												className="w-full"
											>
												{t("whatsapp.createJob")}
											</Button>
										</div>
									))
								)}
							</div>
						</TabsContent>
					</Tabs>
				</div>

				{/* Job Creation Form */}
				{(activeRecommendation !== null || activeWhatsAppLead !== null) && (
					<div className="border-t pt-4 mt-4 space-y-4">
						<div className="grid grid-cols-2 gap-4">
							<div>
								<Label htmlFor="title" className="text-sm font-medium">
									{t("ui.form.title")} {t("ui.form.required")}
								</Label>
								<Input
									id="title"
									value={formData.title}
									onChange={(e) => {
										setFormData((prev) => ({ ...prev, title: e.target.value }));
									}}
									className="mt-1"
								/>
							</div>
							<div>
								<Label htmlFor="priority" className="text-sm font-medium">
									{t("ui.form.priority")}
								</Label>
								<Select
									value={formData.priority}
									onValueChange={(value: JobPriority) => {
										setFormData((prev) => ({ ...prev, priority: value }));
									}}
								>
									<SelectTrigger className="mt-1">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="normal">
											{t("ui.form.priorityOptions.normal")}
										</SelectItem>
										<SelectItem value="urgent">
											{t("ui.form.priorityOptions.urgent")}
										</SelectItem>
										<SelectItem value="emergency">
											{t("ui.form.priorityOptions.emergency")}
										</SelectItem>
									</SelectContent>
								</Select>
							</div>
						</div>

						<div>
							<Label htmlFor="description" className="text-sm font-medium">
								{t("ui.form.description")}
							</Label>
							<Textarea
								id="description"
								value={formData.description}
								onChange={(e) => {
									setFormData((prev) => ({
										...prev,
										description: e.target.value,
									}));
								}}
								className="mt-1"
								rows={2}
							/>
						</div>

						<div className="grid grid-cols-2 gap-4">
							<div>
								<Label htmlFor="startTime" className="text-sm font-medium">
									{t("ui.form.startTime")} {t("ui.form.required")}
								</Label>
								<Input
									id="startTime"
									type="datetime-local"
									value={formData.startTime || getNextAvailableSlot()}
									onChange={(e) => {
										setFormData((prev) => ({
											...prev,
											startTime: e.target.value,
										}));
									}}
									className="mt-1"
								/>
							</div>
							<div>
								<Label htmlFor="duration" className="text-sm font-medium">
									{t("ui.form.duration")}
								</Label>
								<Input
									id="duration"
									type="number"
									min="15"
									step="15"
									value={formData.duration}
									onChange={(e) => {
										const v = parseInt(e.target.value, 10);
										setFormData((prev) => ({
											...prev,
											duration: Number.isNaN(v) ? 60 : v,
										}));
									}}
									className="mt-1"
								/>
							</div>
						</div>

						<div>
							<Label htmlFor="primaryEmployee" className="text-sm font-medium">
								{t("ui.form.primaryEmployee")} {t("ui.form.required")}
							</Label>
							<Select
								value={formData.primaryEmployeeId}
								onValueChange={(value) => {
									setFormData((prev) => ({
										...prev,
										primaryEmployeeId: value,
									}));
								}}
							>
								<SelectTrigger className="mt-1">
									<SelectValue placeholder="Selecteer monteur" />
								</SelectTrigger>
								<SelectContent>
									{employees.map((emp) => (
										<SelectItem key={emp.id} value={emp.id}>
											{emp.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="flex gap-3 pt-2">
							<Button
								onClick={resetForm}
								variant="outline"
								className="flex-1"
								disabled={createJobMutation.isPending}
							>
								{t("actions.cancel")}
							</Button>
							<Button
								onClick={handleSubmit}
								className="flex-1"
								disabled={createJobMutation.isPending}
							>
								{createJobMutation.isPending
									? t("actions.creating")
									: t("actions.create")}
							</Button>
						</div>
					</div>
				)}
			</SheetContent>
		</Sheet>
	);
}
