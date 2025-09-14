"use client";

import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import type { JSX } from "react";
import { useMemo, useState } from "react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { useT } from "~/i18n/client";
import { api } from "~/lib/trpc/client";
import type { CustomerDTO } from "~/types/customer";
import CustomerCreateDialog from "./CustomerCreateDialog";
import CustomerEditDialog from "./CustomerEditDialog";
import CustomersTable from "./CustomersTable";

export default function CustomersPage(): JSX.Element {
	const t = useT("customers");
	const tCommon = useT("common");
	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
	const [editingCustomer, setEditingCustomer] = useState<
		CustomerDTO | undefined
	>();

	// Fetch active customers
	const {
		data: customers = [],
		isLoading,
		error,
		refetch: refetchCustomers,
	} = api.customers.list.useQuery({});

	// Fetch archived customers
	const {
		data: archivedCustomers = [],
		isLoading: isLoadingArchived,
		error: errorArchived,
		refetch: refetchArchivedCustomers,
	} = api.customers.listArchived.useQuery({});

	// Fetch customer counts
	const { data: customerCount = 0 } = api.customers.count.useQuery();
	const { data: archivedCustomerCount = 0 } =
		api.customers.countArchived.useQuery();

	// Calculate stats
	const stats = useMemo(() => {
		const thisMonth = Temporal.Now.zonedDateTimeISO("Europe/Amsterdam")
			.with({ day: 1 })
			.toInstant()
			.toString();

		const thisMonthCustomers = customers.filter(
			(customer) => customer.createdAt >= thisMonth,
		).length;

		return {
			total: customerCount,
			thisMonth: thisMonthCustomers,
			active: customers.length,
			archived: archivedCustomerCount,
		};
	}, [customers, customerCount, archivedCustomerCount]);

	const handleCustomerCreated = (): void => {
		void refetchCustomers();
		setIsCreateDialogOpen(false);
	};

	const handleCustomerUpdated = (): void => {
		void refetchCustomers();
		void refetchArchivedCustomers();
		setEditingCustomer(undefined);
	};

	const handleCustomerDeleted = (): void => {
		void refetchCustomers();
		void refetchArchivedCustomers();
	};

	if (error) {
		return (
			<div className="flex h-96 items-center justify-center">
				<div className="text-center">
					<p className="text-lg font-medium text-destructive">
						{t("error.load")}
					</p>
					<p className="text-sm text-muted-foreground">{error.message}</p>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="text-3xl font-bold text-foreground">{t("title")}</h1>
					<p className="mt-2 text-muted-foreground">{t("description")}</p>
				</div>

				<Button
					onClick={() => {
						setIsCreateDialogOpen(true);
					}}
				>
					<Plus className="mr-2 h-4 w-4" />
					{t("addNew")}
				</Button>
			</div>

			{/* Stats Overview Cards */}
			<div className="grid grid-cols-1 gap-4 md:grid-cols-4">
				<Card>
					<CardHeader className="pb-2">
						<div className="flex items-center justify-between">
							<CardTitle className="text-sm font-medium text-muted-foreground">
								{t("stats.total")}
							</CardTitle>
							<Badge variant="secondary">{stats.total}</Badge>
						</div>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-primary">{stats.total}</div>
						<p className="mt-1 text-xs text-muted-foreground">
							{t("stats.total")}
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="pb-2">
						<div className="flex items-center justify-between">
							<CardTitle className="text-sm font-medium text-muted-foreground">
								{t("stats.thisMonth")}
							</CardTitle>
							<Badge variant="default">{stats.thisMonth}</Badge>
						</div>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-primary">
							{stats.thisMonth}
						</div>
						<p className="mt-1 text-xs text-muted-foreground">
							{t("stats.thisMonth")}
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="pb-2">
						<div className="flex items-center justify-between">
							<CardTitle className="text-sm font-medium text-muted-foreground">
								{t("stats.active")}
							</CardTitle>
							<Badge variant="outline">{stats.active}</Badge>
						</div>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-primary">
							{stats.active}
						</div>
						<p className="mt-1 text-xs text-muted-foreground">
							{t("stats.active")}
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="pb-2">
						<div className="flex items-center justify-between">
							<CardTitle className="text-sm font-medium text-muted-foreground">
								{t("stats.archived")}
							</CardTitle>
							<Badge variant="destructive">{stats.archived}</Badge>
						</div>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-primary">
							{stats.archived}
						</div>
						<p className="mt-1 text-xs text-muted-foreground">
							{t("stats.archived")}
						</p>
					</CardContent>
				</Card>
			</div>

			{/* Customers Tabs */}
			<Tabs defaultValue="active" className="space-y-4">
				<TabsList>
					<TabsTrigger value="active">
						{t("title")} ({stats.active})
					</TabsTrigger>
					<TabsTrigger value="archived">
						{t("archived.tab")} ({stats.archived})
					</TabsTrigger>
				</TabsList>

				<TabsContent value="active" className="space-y-4">
					<Card>
						<CardHeader>
							<CardTitle>{t("title")}</CardTitle>
							<CardDescription>{t("description")}</CardDescription>
						</CardHeader>
						<CardContent>
							{isLoading ? (
								<div className="flex h-48 items-center justify-center">
									<div className="text-center">
										<div className="text-lg font-medium text-muted-foreground">
											{tCommon("loading")}
										</div>
									</div>
								</div>
							) : (
								<CustomersTable
									customers={customers}
									onEdit={(customer) => {
										setEditingCustomer(customer);
									}}
									onDelete={handleCustomerDeleted}
								/>
							)}
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="archived" className="space-y-4">
					<Card>
						<CardHeader>
							<CardTitle>{t("archived.title")}</CardTitle>
							<CardDescription>{t("archived.description")}</CardDescription>
						</CardHeader>
						<CardContent>
							{errorArchived ? (
								<div className="flex h-48 items-center justify-center">
									<div className="text-center">
										<p className="text-lg font-medium text-destructive">
											{t("error.load")}
										</p>
										<p className="text-sm text-muted-foreground">
											{errorArchived.message}
										</p>
									</div>
								</div>
							) : isLoadingArchived ? (
								<div className="flex h-48 items-center justify-center">
									<div className="text-center">
										<div className="text-lg font-medium text-muted-foreground">
											{tCommon("loading")}
										</div>
									</div>
								</div>
							) : (
								<CustomersTable
									customers={archivedCustomers}
									onEdit={(customer) => {
										setEditingCustomer(customer);
									}}
									onDelete={handleCustomerDeleted}
									showArchived
								/>
							)}
						</CardContent>
					</Card>
				</TabsContent>
			</Tabs>

			{/* Create Dialog */}
			<CustomerCreateDialog
				open={isCreateDialogOpen}
				onOpenChange={setIsCreateDialogOpen}
				onCustomerCreated={handleCustomerCreated}
			/>

			{/* Edit Dialog */}
			<CustomerEditDialog
				open={!!editingCustomer}
				onOpenChange={(open) => {
					if (!open) setEditingCustomer(undefined);
				}}
				customer={editingCustomer}
				onCustomerUpdated={handleCustomerUpdated}
			/>
		</div>
	);
}
