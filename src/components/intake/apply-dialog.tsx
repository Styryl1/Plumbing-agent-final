"use client";

import { useTranslations } from "next-intl";
import type { FormEvent, JSX } from "react";
import { useState } from "react";
import { toast } from "sonner";
import { Temporal } from "temporal-polyfill";

import { Button } from "~/components/ui/button";
import { CustomerPicker } from "~/components/ui/customer-picker";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "~/components/ui/select";
import { Textarea } from "~/components/ui/textarea";

import type { AiRecommendationDTO } from "~/types/ai";
import type { IntakeDetailDTO } from "~/types/intake";
import type { JobPriority } from "~/types/job";

export type EmployeeOption = {
	id: string;
	name: string;
	color: string | null;
};

export type ApplyMutationInput = {
	intakeEventId: string;
	suggestionId?: string;
	job: {
		title: string;
		description?: string;
		startIso: string;
		durationMinutes: number;
		priority: JobPriority;
		employeeId?: string | null;
	};
	customer:
		| { mode: "existing"; id: string }
		| {
				mode: "new";
				name: string;
				phone: string;
				email?: string;
				language?: "nl" | "en";
				street?: string;
				houseNumber?: string;
				postalCode?: string;
				city?: string;
		  };
	site?: {
		label?: string;
		street?: string;
		houseNumber?: string;
		addition?: string;
		postalCode?: string;
		city?: string;
	};
	notes?: string;
};

export type ApplyDialogContext = {
	intake: IntakeDetailDTO;
	recommendation: AiRecommendationDTO | null;
};

type ConfidenceMeta = {
	state: "high" | "medium" | "low" | "none";
	label: string;
	description?: string;
};

const PRIORITY_OPTIONS: JobPriority[] = ["normal", "urgent", "emergency"];

const mapUrgencyToPriority = (
	urgency?: AiRecommendationDTO["urgency"],
): JobPriority => {
	if (urgency === "high") return "emergency";
	if (urgency === "medium") return "urgent";
	return "normal";
};

const toLocalInput = (iso: string): string => {
	try {
		return Temporal.Instant.from(iso)
			.toZonedDateTimeISO("Europe/Amsterdam")
			.toPlainDateTime()
			.toString()
			.slice(0, 16);
	} catch {
		return Temporal.Now.zonedDateTimeISO("Europe/Amsterdam")
			.toPlainDateTime()
			.toString()
			.slice(0, 16);
	}
};

const toInstantIso = (value: string): string => {
	const normalized =
		value.length === 16 && value.includes(":") ? `${value}:00` : value;
	return Temporal.PlainDateTime.from(normalized)
		.toZonedDateTime("Europe/Amsterdam")
		.toInstant()
		.toString();
};

const buildConfidenceMeta = (
	score: number | null,
	translate: (key: string) => string,
): ConfidenceMeta => {
	if (score === null) {
		return { state: "none", label: translate("none") };
	}
	if (score >= 0.7) {
		return {
			state: "high",
			label: translate("high"),
			description: translate("highSubtitle"),
		};
	}
	if (score >= 0.5) {
		return {
			state: "medium",
			label: translate("medium"),
			description: translate("mediumSubtitle"),
		};
	}
	return {
		state: "low",
		label: translate("low"),
		description: translate("lowSubtitle"),
	};
};

export interface ApplyDialogProps {
	context: ApplyDialogContext;
	employees: EmployeeOption[];
	isSubmitting: boolean;
	onSubmit: (payload: ApplyMutationInput) => Promise<void>;
	onClose: () => void;
}

export function ApplyDialog({
	context,
	employees,
	isSubmitting,
	onSubmit,
	onClose,
}: ApplyDialogProps): JSX.Element {
	const { intake, recommendation } = context;
	const translate = useTranslations();
	const apply = (
		suffix: string,
		values?: Record<string, string | number>,
	): string =>
		translate(
			`intake.console.apply.${suffix}` as Parameters<typeof translate>[0],
			values,
		);
	const consoleText = (
		suffix: string,
		values?: Record<string, string | number>,
	): string =>
		translate(
			`intake.console.${suffix}` as Parameters<typeof translate>[0],
			values,
		);
	const translateConfidence = (key: string): string =>
		translate(
			`intake.console.confidence.${key}` as Parameters<typeof translate>[0],
		);

	const snippetFallback =
		typeof intake.details.snippet === "string" ? intake.details.snippet : "";

	const [title, setTitle] = useState(
		() => recommendation?.title ?? intake.summary,
	);
	const [description, setDescription] = useState(
		() =>
			recommendation?.actionText ?? recommendation?.summary ?? snippetFallback,
	);
	const [startLocal, setStartLocal] = useState(() => {
		try {
			const base = Temporal.Instant.from(intake.receivedAtIso)
				.toZonedDateTimeISO("Europe/Amsterdam")
				.add({ minutes: 30 })
				.toInstant()
				.toString();
			return toLocalInput(base);
		} catch {
			return toLocalInput(intake.receivedAtIso);
		}
	});
	const [durationMinutes, setDurationMinutes] = useState(
		() => recommendation?.estimate?.durationMinutes ?? 60,
	);
	const [priority, setPriority] = useState<JobPriority>(
		mapUrgencyToPriority(recommendation?.urgency),
	);
	const [employeeId, setEmployeeId] = useState<string | undefined>(undefined);
	const [notes, setNotes] = useState(
		() => recommendation?.summary ?? snippetFallback,
	);
	const [customerMode, setCustomerMode] = useState<"existing" | "new">(
		intake.customer?.id ? "existing" : "new",
	);
	const [existingCustomerId, setExistingCustomerId] = useState<
		string | undefined
	>(intake.customer?.id ?? undefined);
	const [newCustomer, setNewCustomer] = useState({
		name: intake.customer?.name ?? "",
		phone: intake.customer?.phoneE164 ?? "",
		email: "",
		language: "nl" as "nl" | "en",
		street: "",
		houseNumber: "",
		addition: "",
		postalCode: "",
		city: "",
	});
	const [site, setSite] = useState({
		label: "",
		street: "",
		houseNumber: "",
		addition: "",
		postalCode: "",
		city: "",
	});
	const [formError, setFormError] = useState<string | null>(null);

	const confidenceMeta = buildConfidenceMeta(
		recommendation?.confidenceScore ?? null,
		translateConfidence,
	);

	const handleSubmit = async (
		event: FormEvent<HTMLFormElement>,
	): Promise<void> => {
		event.preventDefault();
		setFormError(null);

		if (!title.trim()) {
			setFormError(apply("validation.title"));
			return;
		}

		let startIso: string;
		try {
			startIso = toInstantIso(startLocal);
		} catch {
			setFormError(apply("validation.start"));
			return;
		}

		if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
			setFormError(apply("validation.duration"));
			return;
		}

		let customerPayload: ApplyMutationInput["customer"];
		if (customerMode === "existing") {
			if (!existingCustomerId) {
				setFormError(apply("validation.customer"));
				return;
			}
			customerPayload = { mode: "existing", id: existingCustomerId };
		} else {
			if (!newCustomer.name.trim() || !newCustomer.phone.trim()) {
				setFormError(apply("validation.customer"));
				return;
			}
			const nextCustomer: Exclude<
				ApplyMutationInput["customer"],
				{ mode: "existing"; id: string }
			> = {
				mode: "new",
				name: newCustomer.name.trim(),
				phone: newCustomer.phone.trim(),
				language: newCustomer.language,
			};
			const email = newCustomer.email.trim();
			if (email) nextCustomer.email = email;
			const street = newCustomer.street.trim();
			if (street) nextCustomer.street = street;
			const houseNumber = newCustomer.houseNumber.trim();
			if (houseNumber) nextCustomer.houseNumber = houseNumber;
			const postalCode = newCustomer.postalCode.trim();
			if (postalCode) nextCustomer.postalCode = postalCode;
			const city = newCustomer.city.trim();
			if (city) nextCustomer.city = city;
			customerPayload = nextCustomer;
		}

		const sitePayload: ApplyMutationInput["site"] | undefined = (() => {
			const trimmed = {
				label: site.label.trim(),
				street: site.street.trim(),
				houseNumber: site.houseNumber.trim(),
				addition: site.addition.trim(),
				postalCode: site.postalCode.trim(),
				city: site.city.trim(),
			};
			if (Object.values(trimmed).every((value) => value.length === 0)) {
				return undefined;
			}
			const nextSite: NonNullable<ApplyMutationInput["site"]> = {};
			if (trimmed.label) nextSite.label = trimmed.label;
			if (trimmed.street) nextSite.street = trimmed.street;
			if (trimmed.houseNumber) nextSite.houseNumber = trimmed.houseNumber;
			if (trimmed.addition) nextSite.addition = trimmed.addition;
			if (trimmed.postalCode) nextSite.postalCode = trimmed.postalCode;
			if (trimmed.city) nextSite.city = trimmed.city;
			return nextSite;
		})();

		const jobPayload: ApplyMutationInput["job"] = {
			title: title.trim(),
			startIso,
			durationMinutes,
			priority,
			employeeId: employeeId ?? null,
		};
		const jobDescription = description.trim();
		if (jobDescription) jobPayload.description = jobDescription;

		const result: ApplyMutationInput = {
			intakeEventId: intake.id,
			job: jobPayload,
			customer: customerPayload,
			...(sitePayload ? { site: sitePayload } : {}),
		};
		if (recommendation?.id) {
			result.suggestionId = recommendation.id;
		}
		const trimmedNotes = notes.trim();
		if (trimmedNotes) result.notes = trimmedNotes;

		try {
			await onSubmit(result);
		} catch (error) {
			setFormError(error instanceof Error ? error.message : apply("error"));
		}
	};

	return (
		<Dialog
			open
			onOpenChange={(open) => {
				if (!open) onClose();
			}}
		>
			<DialogContent className="max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>{apply("title")}</DialogTitle>
					<DialogDescription className="text-muted-foreground">
						{apply("subtitle")}
					</DialogDescription>
				</DialogHeader>
				<form className="space-y-6" onSubmit={handleSubmit}>
					<section className="space-y-4">
						<h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
							{apply("jobSection")}
						</h2>
						<div className="space-y-2">
							<Label htmlFor="apply-title">{apply("fields.title")}</Label>
							<Input
								id="apply-title"
								value={title}
								onChange={(event) => {
									setTitle(event.target.value);
								}}
								required
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="apply-description">
								{apply("fields.description")}
							</Label>
							<Textarea
								id="apply-description"
								value={description}
								onChange={(event) => {
									setDescription(event.target.value);
								}}
								rows={3}
							/>
						</div>
						<div className="grid gap-4 sm:grid-cols-2">
							<div className="space-y-2">
								<Label htmlFor="apply-start">{apply("fields.start")}</Label>
								<Input
									id="apply-start"
									type="datetime-local"
									value={startLocal}
									onChange={(event) => {
										setStartLocal(event.target.value);
									}}
									required
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="apply-duration">
									{apply("fields.duration")}
								</Label>
								<Input
									id="apply-duration"
									type="number"
									min={15}
									step={15}
									value={durationMinutes}
									onChange={(event) => {
										setDurationMinutes(Number.parseInt(event.target.value, 10));
									}}
									required
								/>
							</div>
						</div>
						<div className="grid gap-4 sm:grid-cols-2">
							<div className="space-y-2">
								<Label>{apply("fields.priority")}</Label>
								<Select
									value={priority}
									onValueChange={(value) => {
										setPriority(value as JobPriority);
									}}
								>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{PRIORITY_OPTIONS.map((option) => (
											<SelectItem key={option} value={option}>
												{apply(`priority.${option}`)}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div className="space-y-2">
								<Label>{apply("fields.employee")}</Label>
								<Select
									value={employeeId ?? ""}
									onValueChange={(value) => {
										setEmployeeId(value === "" ? undefined : value);
									}}
								>
									<SelectTrigger>
										<SelectValue
											placeholder={apply("fields.employeePlaceholder")}
										/>
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="">
											{apply("fields.employeeUnassigned")}
										</SelectItem>
										{employees.map((employee) => (
											<SelectItem key={employee.id} value={employee.id}>
												{employee.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</div>
						<div className="space-y-2">
							<Label htmlFor="apply-notes">{apply("fields.notes")}</Label>
							<Textarea
								id="apply-notes"
								value={notes}
								onChange={(event) => {
									setNotes(event.target.value);
								}}
								rows={3}
							/>
						</div>
					</section>

					<section className="space-y-4">
						<h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
							{apply("customerSection")}
						</h2>
						<div className="grid gap-4 sm:grid-cols-2">
							<div className="space-y-2">
								<Label>{apply("fields.customerMode")}</Label>
								<Select
									value={customerMode}
									onValueChange={(value) => {
										setCustomerMode(value as "existing" | "new");
									}}
								>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="existing">
											{apply("modeExisting")}
										</SelectItem>
										<SelectItem value="new">{apply("modeNew")}</SelectItem>
									</SelectContent>
								</Select>
							</div>
							{customerMode === "existing" ? (
								<div className="space-y-2">
									<Label>{apply("fields.customer")}</Label>
									<CustomerPicker
										value={existingCustomerId}
										onChange={(value) => {
											setExistingCustomerId(value);
										}}
										placeholder={apply("fields.customerPlaceholder")}
									/>
								</div>
							) : (
								<div className="grid gap-4 sm:grid-cols-2">
									<InputWithLabel
										id="apply-new-name"
										label={apply("fields.name")}
										value={newCustomer.name}
										onChange={(value) => {
											setNewCustomer((prev) => ({ ...prev, name: value }));
										}}
										required
									/>
									<InputWithLabel
										id="apply-new-phone"
										label={apply("fields.phone")}
										value={newCustomer.phone}
										onChange={(value) => {
											setNewCustomer((prev) => ({ ...prev, phone: value }));
										}}
										required
									/>
									<InputWithLabel
										id="apply-new-email"
										label={apply("fields.email")}
										value={newCustomer.email}
										onChange={(value) => {
											setNewCustomer((prev) => ({ ...prev, email: value }));
										}}
										type="email"
									/>
									<div className="space-y-2">
										<Label>{apply("fields.language")}</Label>
										<Select
											value={newCustomer.language}
											onValueChange={(value) => {
												setNewCustomer((prev) => ({
													...prev,
													language: value as "nl" | "en",
												}));
											}}
										>
											<SelectTrigger>
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="nl">
													{apply("fields.languageOptionNl")}
												</SelectItem>
												<SelectItem value="en">
													{apply("fields.languageOptionEn")}
												</SelectItem>
											</SelectContent>
										</Select>
									</div>
								</div>
							)}
						</div>
					</section>

					<section className="space-y-4">
						<h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
							{apply("siteSection")}
						</h2>
						<div className="grid gap-4 sm:grid-cols-2">
							<InputWithLabel
								id="apply-site-label"
								label={apply("fields.siteLabel")}
								value={site.label}
								onChange={(value) => {
									setSite((prev) => ({ ...prev, label: value }));
								}}
							/>
							<InputWithLabel
								id="apply-site-street"
								label={apply("fields.street")}
								value={site.street}
								onChange={(value) => {
									setSite((prev) => ({ ...prev, street: value }));
								}}
							/>
							<InputWithLabel
								id="apply-site-house-number"
								label={apply("fields.houseNumber")}
								value={site.houseNumber}
								onChange={(value) => {
									setSite((prev) => ({ ...prev, houseNumber: value }));
								}}
							/>
							<InputWithLabel
								id="apply-site-addition"
								label={apply("fields.addition")}
								value={site.addition}
								onChange={(value) => {
									setSite((prev) => ({ ...prev, addition: value }));
								}}
							/>
							<InputWithLabel
								id="apply-site-postal"
								label={apply("fields.postalCode")}
								value={site.postalCode}
								onChange={(value) => {
									setSite((prev) => ({ ...prev, postalCode: value }));
								}}
							/>
							<InputWithLabel
								id="apply-site-city"
								label={apply("fields.city")}
								value={site.city}
								onChange={(value) => {
									setSite((prev) => ({ ...prev, city: value }));
								}}
							/>
						</div>
					</section>

					{recommendation ? (
						<div className="rounded-md border border-dashed p-4 text-xs text-muted-foreground">
							<div className="flex items-center justify-between">
								<span>{consoleText("suggestions.actions.apply")}</span>
								{confidenceMeta.state !== "none" && (
									<span>
										{confidenceMeta.label}
										{confidenceMeta.description
											? ` · ${confidenceMeta.description}`
											: ""}
									</span>
								)}
							</div>
						</div>
					) : null}

					{formError ? (
						<p className="text-sm text-destructive">{formError}</p>
					) : null}

					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={onClose}
							disabled={isSubmitting}
						>
							{apply("cancel")}
						</Button>
						<Button type="submit" disabled={isSubmitting}>
							{isSubmitting ? apply("submitting") : apply("submit")}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

export function showApplySuccessToast(
	translate: (key: string, values?: Record<string, string | number>) => string,
	undo: (undoToken: string) => void,
	result: { undoToken: string },
): void {
	toast.success(translate("intake.console.apply.success"), {
		action: {
			label: translate("intake.console.apply.undoAction"),
			onClick: () => {
				undo(result.undoToken);
			},
		},
	});
}

export function showApplyErrorToast(
	translate: (key: string, values?: Record<string, string | number>) => string,
	error: unknown,
): void {
	toast.error(
		error instanceof Error
			? error.message
			: translate("intake.console.apply.error"),
	);
}

function InputWithLabel({
	id,
	label,
	value,
	onChange,
	type = "text",
	required,
}: {
	id: string;
	label: string;
	value: string;
	onChange: (value: string) => void;
	type?: string;
	required?: boolean;
}): JSX.Element {
	return (
		<div className="space-y-2">
			<Label htmlFor={id}>{label}</Label>
			<Input
				id={id}
				type={type}
				value={value}
				onChange={(event) => {
					onChange(event.target.value);
				}}
				required={required}
			/>
		</div>
	);
}
