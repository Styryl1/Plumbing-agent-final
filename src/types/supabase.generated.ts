export type Json =
	| string
	| number
	| boolean
	| null
	| { [key: string]: Json | undefined }
	| Json[];

export type Database = {
	// Allows to automatically instantiate createClient with right options
	// instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
	__InternalSupabase: {
		PostgrestVersion: "13.0.4";
	};
	public: {
		Tables: {
			ai_runs: {
				Row: {
					conversation_id: string | null;
					cost_cents: number | null;
					created_at: string;
					customer_id: string | null;
					id: string;
					input: Json;
					job_id: string | null;
					latency_ms: number;
					model: string;
					org_id: string;
					output: Json;
				};
				Insert: {
					conversation_id?: string | null;
					cost_cents?: number | null;
					created_at?: string;
					customer_id?: string | null;
					id?: string;
					input: Json;
					job_id?: string | null;
					latency_ms: number;
					model: string;
					org_id: string;
					output: Json;
				};
				Update: {
					conversation_id?: string | null;
					cost_cents?: number | null;
					created_at?: string;
					customer_id?: string | null;
					id?: string;
					input?: Json;
					job_id?: string | null;
					latency_ms?: number;
					model?: string;
					org_id?: string;
					output?: Json;
				};
				Relationships: [
					{
						foreignKeyName: "ai_runs_conversation_id_fkey";
						columns: ["conversation_id"];
						isOneToOne: false;
						referencedRelation: "vw_wa_conversation_last";
						referencedColumns: ["conversation_id"];
					},
					{
						foreignKeyName: "ai_runs_conversation_id_fkey";
						columns: ["conversation_id"];
						isOneToOne: false;
						referencedRelation: "wa_conversations";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "ai_runs_customer_id_fkey";
						columns: ["customer_id"];
						isOneToOne: false;
						referencedRelation: "customers";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "ai_runs_job_id_fkey";
						columns: ["job_id"];
						isOneToOne: false;
						referencedRelation: "jobs";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "ai_runs_org_id_fkey";
						columns: ["org_id"];
						isOneToOne: false;
						referencedRelation: "organizations";
						referencedColumns: ["id"];
					},
				];
			};
			audit_logs: {
				Row: {
					action: string;
					created_at: string;
					id: string;
					org_id: string;
					payload_json: Json | null;
					resource: string | null;
					user_id: string | null;
				};
				Insert: {
					action: string;
					created_at?: string;
					id?: string;
					org_id: string;
					payload_json?: Json | null;
					resource?: string | null;
					user_id?: string | null;
				};
				Update: {
					action?: string;
					created_at?: string;
					id?: string;
					org_id?: string;
					payload_json?: Json | null;
					resource?: string | null;
					user_id?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: "audit_logs_org_id_fkey";
						columns: ["org_id"];
						isOneToOne: false;
						referencedRelation: "organizations";
						referencedColumns: ["id"];
					},
				];
			};
			customers: {
				Row: {
					address: string | null;
					archived_at: string | null;
					created_at: string | null;
					email: string | null;
					id: string;
					language: string;
					name: string;
					opt_out_dunning: boolean | null;
					org_id: string;
					phone: string | null;
					postal_code: string | null;
				};
				Insert: {
					address?: string | null;
					archived_at?: string | null;
					created_at?: string | null;
					email?: string | null;
					id?: string;
					language?: string;
					name: string;
					opt_out_dunning?: boolean | null;
					org_id: string;
					phone?: string | null;
					postal_code?: string | null;
				};
				Update: {
					address?: string | null;
					archived_at?: string | null;
					created_at?: string | null;
					email?: string | null;
					id?: string;
					language?: string;
					name?: string;
					opt_out_dunning?: boolean | null;
					org_id?: string;
					phone?: string | null;
					postal_code?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: "customers_org_id_fkey";
						columns: ["org_id"];
						isOneToOne: false;
						referencedRelation: "organizations";
						referencedColumns: ["id"];
					},
				];
			};
			dunning_events: {
				Row: {
					channel: string;
					created_at: string | null;
					customer_id: string;
					delivered_at: string | null;
					delivery_status: string | null;
					event_type: string;
					id: string;
					invoice_id: string;
					org_id: string;
					template_used: string | null;
				};
				Insert: {
					channel: string;
					created_at?: string | null;
					customer_id: string;
					delivered_at?: string | null;
					delivery_status?: string | null;
					event_type: string;
					id?: string;
					invoice_id: string;
					org_id: string;
					template_used?: string | null;
				};
				Update: {
					channel?: string;
					created_at?: string | null;
					customer_id?: string;
					delivered_at?: string | null;
					delivery_status?: string | null;
					event_type?: string;
					id?: string;
					invoice_id?: string;
					org_id?: string;
					template_used?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: "dunning_events_customer_id_fkey";
						columns: ["customer_id"];
						isOneToOne: false;
						referencedRelation: "customers";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "dunning_events_invoice_id_fkey";
						columns: ["invoice_id"];
						isOneToOne: false;
						referencedRelation: "invoices";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "dunning_events_invoice_id_fkey";
						columns: ["invoice_id"];
						isOneToOne: false;
						referencedRelation: "overdue_invoices";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "dunning_events_org_id_fkey";
						columns: ["org_id"];
						isOneToOne: false;
						referencedRelation: "organizations";
						referencedColumns: ["id"];
					},
				];
			};
			employees: {
				Row: {
					active: boolean | null;
					color: string | null;
					created_at: string | null;
					id: string;
					name: string;
					org_id: string;
					role: string;
					user_id: string;
				};
				Insert: {
					active?: boolean | null;
					color?: string | null;
					created_at?: string | null;
					id?: string;
					name: string;
					org_id: string;
					role: string;
					user_id: string;
				};
				Update: {
					active?: boolean | null;
					color?: string | null;
					created_at?: string | null;
					id?: string;
					name?: string;
					org_id?: string;
					role?: string;
					user_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: "employees_org_id_fkey";
						columns: ["org_id"];
						isOneToOne: false;
						referencedRelation: "organizations";
						referencedColumns: ["id"];
					},
				];
			};
			invoice_audit_log: {
				Row: {
					action: string;
					actor_id: string;
					actor_role: string | null;
					changes: Json | null;
					created_at: string | null;
					id: string;
					metadata: Json | null;
					org_id: string;
					resource_id: string;
					resource_type: string;
				};
				Insert: {
					action: string;
					actor_id: string;
					actor_role?: string | null;
					changes?: Json | null;
					created_at?: string | null;
					id?: string;
					metadata?: Json | null;
					org_id: string;
					resource_id: string;
					resource_type: string;
				};
				Update: {
					action?: string;
					actor_id?: string;
					actor_role?: string | null;
					changes?: Json | null;
					created_at?: string | null;
					id?: string;
					metadata?: Json | null;
					org_id?: string;
					resource_id?: string;
					resource_type?: string;
				};
				Relationships: [
					{
						foreignKeyName: "invoice_audit_log_org_id_fkey";
						columns: ["org_id"];
						isOneToOne: false;
						referencedRelation: "organizations";
						referencedColumns: ["id"];
					},
				];
			};
			invoice_daily_snapshots: {
				Row: {
					aging_0_7_cents: number;
					aging_31_60_cents: number;
					aging_61_plus_cents: number;
					aging_8_30_cents: number;
					created_at: string;
					org_id: string;
					overdue_cents: number;
					overdue_count: number;
					paid_count: number;
					revenue_outstanding_cents: number;
					revenue_paid_cents: number;
					sent_count: number;
					snapshot_date: string;
					total_invoices: number;
					updated_at: string;
				};
				Insert: {
					aging_0_7_cents?: number;
					aging_31_60_cents?: number;
					aging_61_plus_cents?: number;
					aging_8_30_cents?: number;
					created_at?: string;
					org_id: string;
					overdue_cents?: number;
					overdue_count?: number;
					paid_count?: number;
					revenue_outstanding_cents?: number;
					revenue_paid_cents?: number;
					sent_count?: number;
					snapshot_date: string;
					total_invoices?: number;
					updated_at?: string;
				};
				Update: {
					aging_0_7_cents?: number;
					aging_31_60_cents?: number;
					aging_61_plus_cents?: number;
					aging_8_30_cents?: number;
					created_at?: string;
					org_id?: string;
					overdue_cents?: number;
					overdue_count?: number;
					paid_count?: number;
					revenue_outstanding_cents?: number;
					revenue_paid_cents?: number;
					sent_count?: number;
					snapshot_date?: string;
					total_invoices?: number;
					updated_at?: string;
				};
				Relationships: [
					{
						foreignKeyName: "fk_invoice_daily_snapshots_org";
						columns: ["org_id"];
						isOneToOne: false;
						referencedRelation: "organizations";
						referencedColumns: ["id"];
					},
				];
			};
			invoice_lines: {
				Row: {
					created_at: string | null;
					description: string;
					id: string;
					invoice_id: string;
					line_number: number | null;
					line_total_cents: number | null;
					line_total_ex_vat: number;
					line_total_ex_vat_cents: number | null;
					line_total_inc_vat: number;
					line_total_inc_vat_cents: number | null;
					line_type: string;
					org_id: string | null;
					qty: number;
					unit: string | null;
					unit_price_cents: number | null;
					unit_price_ex_vat: number;
					updated_at: string | null;
					vat_amount: number;
					vat_amount_cents: number | null;
					vat_rate: number;
				};
				Insert: {
					created_at?: string | null;
					description: string;
					id?: string;
					invoice_id: string;
					line_number?: number | null;
					line_total_cents?: number | null;
					line_total_ex_vat: number;
					line_total_ex_vat_cents?: number | null;
					line_total_inc_vat: number;
					line_total_inc_vat_cents?: number | null;
					line_type: string;
					org_id?: string | null;
					qty: number;
					unit?: string | null;
					unit_price_cents?: number | null;
					unit_price_ex_vat: number;
					updated_at?: string | null;
					vat_amount: number;
					vat_amount_cents?: number | null;
					vat_rate: number;
				};
				Update: {
					created_at?: string | null;
					description?: string;
					id?: string;
					invoice_id?: string;
					line_number?: number | null;
					line_total_cents?: number | null;
					line_total_ex_vat?: number;
					line_total_ex_vat_cents?: number | null;
					line_total_inc_vat?: number;
					line_total_inc_vat_cents?: number | null;
					line_type?: string;
					org_id?: string | null;
					qty?: number;
					unit?: string | null;
					unit_price_cents?: number | null;
					unit_price_ex_vat?: number;
					updated_at?: string | null;
					vat_amount?: number;
					vat_amount_cents?: number | null;
					vat_rate?: number;
				};
				Relationships: [
					{
						foreignKeyName: "invoice_lines_invoice_id_fkey";
						columns: ["invoice_id"];
						isOneToOne: false;
						referencedRelation: "invoices";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "invoice_lines_invoice_id_fkey";
						columns: ["invoice_id"];
						isOneToOne: false;
						referencedRelation: "overdue_invoices";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "invoice_lines_org_id_fkey";
						columns: ["org_id"];
						isOneToOne: false;
						referencedRelation: "organizations";
						referencedColumns: ["id"];
					},
				];
			};
			invoice_payments: {
				Row: {
					amount_cents: number;
					created_at: string | null;
					failed_at: string | null;
					id: string;
					idempotency_key: string | null;
					invoice_id: string;
					org_id: string;
					paid_at: string | null;
					payment_method: string;
					provider: string | null;
					provider_checkout_url: string | null;
					provider_metadata: Json | null;
					provider_payment_id: string | null;
					provider_status: string | null;
					status: string;
				};
				Insert: {
					amount_cents: number;
					created_at?: string | null;
					failed_at?: string | null;
					id?: string;
					idempotency_key?: string | null;
					invoice_id: string;
					org_id: string;
					paid_at?: string | null;
					payment_method: string;
					provider?: string | null;
					provider_checkout_url?: string | null;
					provider_metadata?: Json | null;
					provider_payment_id?: string | null;
					provider_status?: string | null;
					status?: string;
				};
				Update: {
					amount_cents?: number;
					created_at?: string | null;
					failed_at?: string | null;
					id?: string;
					idempotency_key?: string | null;
					invoice_id?: string;
					org_id?: string;
					paid_at?: string | null;
					payment_method?: string;
					provider?: string | null;
					provider_checkout_url?: string | null;
					provider_metadata?: Json | null;
					provider_payment_id?: string | null;
					provider_status?: string | null;
					status?: string;
				};
				Relationships: [
					{
						foreignKeyName: "invoice_payments_invoice_id_fkey";
						columns: ["invoice_id"];
						isOneToOne: false;
						referencedRelation: "invoices";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "invoice_payments_invoice_id_fkey";
						columns: ["invoice_id"];
						isOneToOne: false;
						referencedRelation: "overdue_invoices";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "invoice_payments_org_id_fkey";
						columns: ["org_id"];
						isOneToOne: false;
						referencedRelation: "organizations";
						referencedColumns: ["id"];
					},
				];
			};
			invoice_provider_credentials: {
				Row: {
					access_token: string;
					administration_id: string | null;
					created_at: string | null;
					expires_at: string;
					id: string;
					org_id: string;
					provider: string;
					refresh_token: string;
					scopes: string[];
					updated_at: string | null;
				};
				Insert: {
					access_token: string;
					administration_id?: string | null;
					created_at?: string | null;
					expires_at: string;
					id?: string;
					org_id: string;
					provider: string;
					refresh_token: string;
					scopes?: string[];
					updated_at?: string | null;
				};
				Update: {
					access_token?: string;
					administration_id?: string | null;
					created_at?: string | null;
					expires_at?: string;
					id?: string;
					org_id?: string;
					provider?: string;
					refresh_token?: string;
					scopes?: string[];
					updated_at?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: "invoice_provider_credentials_org_id_fkey";
						columns: ["org_id"];
						isOneToOne: false;
						referencedRelation: "organizations";
						referencedColumns: ["id"];
					},
				];
			};
			invoice_status_refresh_dead_letters: {
				Row: {
					attempts: number | null;
					deadlettered_at: string | null;
					external_id: string | null;
					id: string;
					invoice_id: string | null;
					last_error: string | null;
					provider: string | null;
				};
				Insert: {
					attempts?: number | null;
					deadlettered_at?: string | null;
					external_id?: string | null;
					id?: string;
					invoice_id?: string | null;
					last_error?: string | null;
					provider?: string | null;
				};
				Update: {
					attempts?: number | null;
					deadlettered_at?: string | null;
					external_id?: string | null;
					id?: string;
					invoice_id?: string | null;
					last_error?: string | null;
					provider?: string | null;
				};
				Relationships: [];
			};
			invoice_status_refresh_queue: {
				Row: {
					attempts: number;
					created_at: string | null;
					external_id: string;
					id: string;
					invoice_id: string;
					last_error: string | null;
					max_attempts: number;
					provider: string;
					run_after: string;
					updated_at: string | null;
				};
				Insert: {
					attempts?: number;
					created_at?: string | null;
					external_id: string;
					id?: string;
					invoice_id: string;
					last_error?: string | null;
					max_attempts?: number;
					provider: string;
					run_after?: string;
					updated_at?: string | null;
				};
				Update: {
					attempts?: number;
					created_at?: string | null;
					external_id?: string;
					id?: string;
					invoice_id?: string;
					last_error?: string | null;
					max_attempts?: number;
					provider?: string;
					run_after?: string;
					updated_at?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: "fk_refresh_queue_invoice";
						columns: ["invoice_id"];
						isOneToOne: true;
						referencedRelation: "invoices";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "fk_refresh_queue_invoice";
						columns: ["invoice_id"];
						isOneToOne: true;
						referencedRelation: "overdue_invoices";
						referencedColumns: ["id"];
					},
				];
			};
			invoices: {
				Row: {
					created_at: string | null;
					created_by: string | null;
					customer_id: string;
					discount_amount_cents: number | null;
					discount_percentage: number | null;
					due_at: string | null;
					external_id: string | null;
					id: string;
					internal_notes: string | null;
					is_legacy: boolean | null;
					issued_at: string;
					job_id: string;
					last_reminder_at: string | null;
					message_ids: Json | null;
					mollie_checkout_url: string | null;
					mollie_payment_id: string | null;
					next_reminder_at: string | null;
					notes: string | null;
					number: string;
					number_int: number | null;
					org_id: string;
					paid_at: string | null;
					payment_method: string | null;
					payment_terms: string | null;
					payment_url: string | null;
					pdf_hash: string | null;
					pdf_object_path: string | null;
					pdf_url: string | null;
					provider: string | null;
					provider_status: string | null;
					reminder_count: number | null;
					sent_at: string | null;
					status: string | null;
					subtotal_cents: number | null;
					subtotal_ex_vat: number;
					total_cents: number | null;
					total_inc_vat: number;
					ubl_url: string | null;
					updated_at: string | null;
					vat_amount_cents: number | null;
					vat_total: number;
					year: number | null;
				};
				Insert: {
					created_at?: string | null;
					created_by?: string | null;
					customer_id: string;
					discount_amount_cents?: number | null;
					discount_percentage?: number | null;
					due_at?: string | null;
					external_id?: string | null;
					id?: string;
					internal_notes?: string | null;
					is_legacy?: boolean | null;
					issued_at?: string;
					job_id: string;
					last_reminder_at?: string | null;
					message_ids?: Json | null;
					mollie_checkout_url?: string | null;
					mollie_payment_id?: string | null;
					next_reminder_at?: string | null;
					notes?: string | null;
					number: string;
					number_int?: number | null;
					org_id: string;
					paid_at?: string | null;
					payment_method?: string | null;
					payment_terms?: string | null;
					payment_url?: string | null;
					pdf_hash?: string | null;
					pdf_object_path?: string | null;
					pdf_url?: string | null;
					provider?: string | null;
					provider_status?: string | null;
					reminder_count?: number | null;
					sent_at?: string | null;
					status?: string | null;
					subtotal_cents?: number | null;
					subtotal_ex_vat?: number;
					total_cents?: number | null;
					total_inc_vat?: number;
					ubl_url?: string | null;
					updated_at?: string | null;
					vat_amount_cents?: number | null;
					vat_total?: number;
					year?: number | null;
				};
				Update: {
					created_at?: string | null;
					created_by?: string | null;
					customer_id?: string;
					discount_amount_cents?: number | null;
					discount_percentage?: number | null;
					due_at?: string | null;
					external_id?: string | null;
					id?: string;
					internal_notes?: string | null;
					is_legacy?: boolean | null;
					issued_at?: string;
					job_id?: string;
					last_reminder_at?: string | null;
					message_ids?: Json | null;
					mollie_checkout_url?: string | null;
					mollie_payment_id?: string | null;
					next_reminder_at?: string | null;
					notes?: string | null;
					number?: string;
					number_int?: number | null;
					org_id?: string;
					paid_at?: string | null;
					payment_method?: string | null;
					payment_terms?: string | null;
					payment_url?: string | null;
					pdf_hash?: string | null;
					pdf_object_path?: string | null;
					pdf_url?: string | null;
					provider?: string | null;
					provider_status?: string | null;
					reminder_count?: number | null;
					sent_at?: string | null;
					status?: string | null;
					subtotal_cents?: number | null;
					subtotal_ex_vat?: number;
					total_cents?: number | null;
					total_inc_vat?: number;
					ubl_url?: string | null;
					updated_at?: string | null;
					vat_amount_cents?: number | null;
					vat_total?: number;
					year?: number | null;
				};
				Relationships: [
					{
						foreignKeyName: "invoices_customer_id_fkey";
						columns: ["customer_id"];
						isOneToOne: false;
						referencedRelation: "customers";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "invoices_job_id_fkey";
						columns: ["job_id"];
						isOneToOne: false;
						referencedRelation: "jobs";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "invoices_org_id_fkey";
						columns: ["org_id"];
						isOneToOne: false;
						referencedRelation: "organizations";
						referencedColumns: ["id"];
					},
				];
			};
			jobs: {
				Row: {
					address: string | null;
					created_at: string | null;
					customer_id: string;
					description: string | null;
					employee_id: string | null;
					ends_at: string | null;
					id: string;
					org_id: string;
					postal_code: string | null;
					priority: string;
					starts_at: string | null;
					status: string;
					title: string;
					updated_at: string | null;
				};
				Insert: {
					address?: string | null;
					created_at?: string | null;
					customer_id: string;
					description?: string | null;
					employee_id?: string | null;
					ends_at?: string | null;
					id?: string;
					org_id: string;
					postal_code?: string | null;
					priority?: string;
					starts_at?: string | null;
					status?: string;
					title: string;
					updated_at?: string | null;
				};
				Update: {
					address?: string | null;
					created_at?: string | null;
					customer_id?: string;
					description?: string | null;
					employee_id?: string | null;
					ends_at?: string | null;
					id?: string;
					org_id?: string;
					postal_code?: string | null;
					priority?: string;
					starts_at?: string | null;
					status?: string;
					title?: string;
					updated_at?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: "jobs_customer_id_fkey";
						columns: ["customer_id"];
						isOneToOne: false;
						referencedRelation: "customers";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "jobs_employee_id_fkey";
						columns: ["employee_id"];
						isOneToOne: false;
						referencedRelation: "employees";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "jobs_org_id_fkey";
						columns: ["org_id"];
						isOneToOne: false;
						referencedRelation: "organizations";
						referencedColumns: ["id"];
					},
				];
			};
			marketing_waitlist: {
				Row: {
					created_at: string | null;
					email: string;
					id: string;
					locale: string;
					org_name: string | null;
					phone: string | null;
					source: string | null;
				};
				Insert: {
					created_at?: string | null;
					email: string;
					id?: string;
					locale?: string;
					org_name?: string | null;
					phone?: string | null;
					source?: string | null;
				};
				Update: {
					created_at?: string | null;
					email?: string;
					id?: string;
					locale?: string;
					org_name?: string | null;
					phone?: string | null;
					source?: string | null;
				};
				Relationships: [];
			};
			org_settings: {
				Row: {
					created_at: string | null;
					default_btw_rate: number | null;
					default_payment_terms: string;
					email_notifications: boolean | null;
					emergency_surcharge_rate: number | null;
					evening_surcharge_rate: number | null;
					fast_confirm_invoices: boolean;
					id: string;
					invoice_prefix: string | null;
					next_invoice_number: number | null;
					org_id: string;
					updated_at: string | null;
					voice_enabled: boolean | null;
					voice_language: string | null;
					weekend_surcharge_rate: number | null;
					whatsapp_notifications: boolean | null;
				};
				Insert: {
					created_at?: string | null;
					default_btw_rate?: number | null;
					default_payment_terms?: string;
					email_notifications?: boolean | null;
					emergency_surcharge_rate?: number | null;
					evening_surcharge_rate?: number | null;
					fast_confirm_invoices?: boolean;
					id?: string;
					invoice_prefix?: string | null;
					next_invoice_number?: number | null;
					org_id: string;
					updated_at?: string | null;
					voice_enabled?: boolean | null;
					voice_language?: string | null;
					weekend_surcharge_rate?: number | null;
					whatsapp_notifications?: boolean | null;
				};
				Update: {
					created_at?: string | null;
					default_btw_rate?: number | null;
					default_payment_terms?: string;
					email_notifications?: boolean | null;
					emergency_surcharge_rate?: number | null;
					evening_surcharge_rate?: number | null;
					fast_confirm_invoices?: boolean;
					id?: string;
					invoice_prefix?: string | null;
					next_invoice_number?: number | null;
					org_id?: string;
					updated_at?: string | null;
					voice_enabled?: boolean | null;
					voice_language?: string | null;
					weekend_surcharge_rate?: number | null;
					whatsapp_notifications?: boolean | null;
				};
				Relationships: [
					{
						foreignKeyName: "org_settings_org_id_fkey";
						columns: ["org_id"];
						isOneToOne: false;
						referencedRelation: "organizations";
						referencedColumns: ["id"];
					},
				];
			};
			organizations: {
				Row: {
					created_at: string | null;
					id: string;
					kvk: string | null;
					name: string;
					owner_user_id: string;
					vat_id: string | null;
					whatsapp_business_number: string | null;
					whatsapp_control_number: string | null;
					whatsapp_settings: Json | null;
				};
				Insert: {
					created_at?: string | null;
					id: string;
					kvk?: string | null;
					name: string;
					owner_user_id: string;
					vat_id?: string | null;
					whatsapp_business_number?: string | null;
					whatsapp_control_number?: string | null;
					whatsapp_settings?: Json | null;
				};
				Update: {
					created_at?: string | null;
					id?: string;
					kvk?: string | null;
					name?: string;
					owner_user_id?: string;
					vat_id?: string | null;
					whatsapp_business_number?: string | null;
					whatsapp_control_number?: string | null;
					whatsapp_settings?: Json | null;
				};
				Relationships: [];
			};
			wa_conversations: {
				Row: {
					created_at: string;
					customer_id: string | null;
					id: string;
					last_message_at: string;
					metadata: Json | null;
					org_id: string;
					phone_number: string;
					session_expires_at: string | null;
					status: string;
					wa_contact_id: string;
				};
				Insert: {
					created_at?: string;
					customer_id?: string | null;
					id?: string;
					last_message_at: string;
					metadata?: Json | null;
					org_id: string;
					phone_number: string;
					session_expires_at?: string | null;
					status?: string;
					wa_contact_id: string;
				};
				Update: {
					created_at?: string;
					customer_id?: string | null;
					id?: string;
					last_message_at?: string;
					metadata?: Json | null;
					org_id?: string;
					phone_number?: string;
					session_expires_at?: string | null;
					status?: string;
					wa_contact_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: "wa_conversations_customer_id_fkey";
						columns: ["customer_id"];
						isOneToOne: false;
						referencedRelation: "customers";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "wa_conversations_org_id_fkey";
						columns: ["org_id"];
						isOneToOne: false;
						referencedRelation: "organizations";
						referencedColumns: ["id"];
					},
				];
			};
			wa_messages: {
				Row: {
					content: string | null;
					conversation_id: string;
					created_at: string;
					direction: string;
					id: string;
					media_url: string | null;
					message_type: string;
					org_id: string;
					payload_json: Json;
					wa_message_id: string;
				};
				Insert: {
					content?: string | null;
					conversation_id: string;
					created_at?: string;
					direction: string;
					id?: string;
					media_url?: string | null;
					message_type: string;
					org_id: string;
					payload_json: Json;
					wa_message_id: string;
				};
				Update: {
					content?: string | null;
					conversation_id?: string;
					created_at?: string;
					direction?: string;
					id?: string;
					media_url?: string | null;
					message_type?: string;
					org_id?: string;
					payload_json?: Json;
					wa_message_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: "wa_messages_conversation_id_fkey";
						columns: ["conversation_id"];
						isOneToOne: false;
						referencedRelation: "vw_wa_conversation_last";
						referencedColumns: ["conversation_id"];
					},
					{
						foreignKeyName: "wa_messages_conversation_id_fkey";
						columns: ["conversation_id"];
						isOneToOne: false;
						referencedRelation: "wa_conversations";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "wa_messages_org_id_fkey";
						columns: ["org_id"];
						isOneToOne: false;
						referencedRelation: "organizations";
						referencedColumns: ["id"];
					},
				];
			};
			wa_numbers: {
				Row: {
					created_at: string;
					label: string | null;
					org_id: string;
					phone_number_id: string;
				};
				Insert: {
					created_at?: string;
					label?: string | null;
					org_id: string;
					phone_number_id: string;
				};
				Update: {
					created_at?: string;
					label?: string | null;
					org_id?: string;
					phone_number_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: "wa_numbers_org_id_fkey";
						columns: ["org_id"];
						isOneToOne: false;
						referencedRelation: "organizations";
						referencedColumns: ["id"];
					},
				];
			};
			wa_read_markers: {
				Row: {
					conversation_id: string;
					created_at: string;
					last_read_at: string;
					org_id: string;
					updated_at: string;
					user_id: string;
				};
				Insert: {
					conversation_id: string;
					created_at?: string;
					last_read_at?: string;
					org_id: string;
					updated_at?: string;
					user_id: string;
				};
				Update: {
					conversation_id?: string;
					created_at?: string;
					last_read_at?: string;
					org_id?: string;
					updated_at?: string;
					user_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: "wa_read_markers_conversation_id_fkey";
						columns: ["conversation_id"];
						isOneToOne: false;
						referencedRelation: "vw_wa_conversation_last";
						referencedColumns: ["conversation_id"];
					},
					{
						foreignKeyName: "wa_read_markers_conversation_id_fkey";
						columns: ["conversation_id"];
						isOneToOne: false;
						referencedRelation: "wa_conversations";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "wa_read_markers_org_id_fkey";
						columns: ["org_id"];
						isOneToOne: false;
						referencedRelation: "organizations";
						referencedColumns: ["id"];
					},
				];
			};
			wa_suggestions: {
				Row: {
					confidence: number;
					conversation_id: string;
					created_at: string;
					id: string;
					message_id: string;
					org_id: string;
					proposed_text: string;
					source: string;
					tags: string[];
					time_estimate_min: number | null;
					urgency: string;
				};
				Insert: {
					confidence: number;
					conversation_id: string;
					created_at?: string;
					id?: string;
					message_id: string;
					org_id: string;
					proposed_text: string;
					source?: string;
					tags?: string[];
					time_estimate_min?: number | null;
					urgency: string;
				};
				Update: {
					confidence?: number;
					conversation_id?: string;
					created_at?: string;
					id?: string;
					message_id?: string;
					org_id?: string;
					proposed_text?: string;
					source?: string;
					tags?: string[];
					time_estimate_min?: number | null;
					urgency?: string;
				};
				Relationships: [
					{
						foreignKeyName: "wa_suggestions_conversation_id_fkey";
						columns: ["conversation_id"];
						isOneToOne: false;
						referencedRelation: "vw_wa_conversation_last";
						referencedColumns: ["conversation_id"];
					},
					{
						foreignKeyName: "wa_suggestions_conversation_id_fkey";
						columns: ["conversation_id"];
						isOneToOne: false;
						referencedRelation: "wa_conversations";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "wa_suggestions_message_id_fkey";
						columns: ["message_id"];
						isOneToOne: false;
						referencedRelation: "wa_messages";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "wa_suggestions_org_id_fkey";
						columns: ["org_id"];
						isOneToOne: false;
						referencedRelation: "organizations";
						referencedColumns: ["id"];
					},
				];
			};
			webhook_events: {
				Row: {
					entity_id: string;
					entity_type: string;
					event_type: string;
					id: string;
					org_id: string | null;
					processed_at: string;
					provider: string;
					webhook_id: string;
				};
				Insert: {
					entity_id: string;
					entity_type: string;
					event_type: string;
					id?: string;
					org_id?: string | null;
					processed_at?: string;
					provider: string;
					webhook_id: string;
				};
				Update: {
					entity_id?: string;
					entity_type?: string;
					event_type?: string;
					id?: string;
					org_id?: string | null;
					processed_at?: string;
					provider?: string;
					webhook_id?: string;
				};
				Relationships: [];
			};
		};
		Views: {
			invoice_timeline: {
				Row: {
					at: string | null;
					invoice_id: string | null;
					meta: Json | null;
					source: string | null;
					type: string | null;
				};
				Relationships: [];
			};
			overdue_invoices: {
				Row: {
					created_at: string | null;
					created_by: string | null;
					customer_email: string | null;
					customer_id: string | null;
					customer_name: string | null;
					customer_phone: string | null;
					days_overdue: number | null;
					discount_amount_cents: number | null;
					discount_percentage: number | null;
					due_at: string | null;
					external_id: string | null;
					id: string | null;
					internal_notes: string | null;
					is_legacy: boolean | null;
					issued_at: string | null;
					job_id: string | null;
					last_reminder_at: string | null;
					message_ids: Json | null;
					mollie_checkout_url: string | null;
					mollie_payment_id: string | null;
					next_reminder_at: string | null;
					notes: string | null;
					number: string | null;
					number_int: number | null;
					opt_out_dunning: boolean | null;
					org_id: string | null;
					overdue_severity: string | null;
					paid_at: string | null;
					payment_method: string | null;
					payment_terms: string | null;
					payment_url: string | null;
					pdf_hash: string | null;
					pdf_object_path: string | null;
					pdf_url: string | null;
					provider: string | null;
					provider_status: string | null;
					reminder_count: number | null;
					sent_at: string | null;
					status: string | null;
					subtotal_cents: number | null;
					subtotal_ex_vat: number | null;
					total_cents: number | null;
					total_inc_vat: number | null;
					ubl_url: string | null;
					updated_at: string | null;
					vat_amount_cents: number | null;
					vat_total: number | null;
					year: number | null;
				};
				Relationships: [
					{
						foreignKeyName: "invoices_customer_id_fkey";
						columns: ["customer_id"];
						isOneToOne: false;
						referencedRelation: "customers";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "invoices_job_id_fkey";
						columns: ["job_id"];
						isOneToOne: false;
						referencedRelation: "jobs";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "invoices_org_id_fkey";
						columns: ["org_id"];
						isOneToOne: false;
						referencedRelation: "organizations";
						referencedColumns: ["id"];
					},
				];
			};
			vw_wa_conversation_last: {
				Row: {
					conversation_id: string | null;
					last_message_at: string | null;
					last_message_snippet: string | null;
					last_message_type: string | null;
					org_id: string | null;
					phone_number: string | null;
					status: string | null;
					wa_contact_id: string | null;
				};
				Relationships: [
					{
						foreignKeyName: "wa_conversations_org_id_fkey";
						columns: ["org_id"];
						isOneToOne: false;
						referencedRelation: "organizations";
						referencedColumns: ["id"];
					},
				];
			};
		};
		Functions: {
			calculate_due_date: {
				Args: { issued_at: string; payment_terms?: string };
				Returns: string;
			};
			cleanup_old_webhook_events: {
				Args: Record<PropertyKey, never>;
				Returns: undefined;
			};
			current_org_id: {
				Args: Record<PropertyKey, never>;
				Returns: string;
			};
			current_user_id_text: {
				Args: Record<PropertyKey, never>;
				Returns: string;
			};
			days_overdue: {
				Args: { invoice_due_at: string };
				Returns: number;
			};
			get_next_invoice_number: {
				Args: { p_org_id: string; p_year: number };
				Returns: number;
			};
			get_user_org_id: {
				Args: Record<PropertyKey, never>;
				Returns: string;
			};
			get_webhook_event_exists: {
				Args: { p_provider: string; p_webhook_id: string };
				Returns: boolean;
			};
			increment_invoice_number: {
				Args: { org_id_param: string };
				Returns: {
					invoice_prefix: string;
					next_invoice_number: number;
				}[];
			};
			is_member_with_role: {
				Args: { p_org: string; p_roles: string[] };
				Returns: boolean;
			};
			issue_invoice: {
				Args: { p_invoice_id: string };
				Returns: {
					created_at: string | null;
					created_by: string | null;
					customer_id: string;
					discount_amount_cents: number | null;
					discount_percentage: number | null;
					due_at: string | null;
					external_id: string | null;
					id: string;
					internal_notes: string | null;
					is_legacy: boolean | null;
					issued_at: string;
					job_id: string;
					last_reminder_at: string | null;
					message_ids: Json | null;
					mollie_checkout_url: string | null;
					mollie_payment_id: string | null;
					next_reminder_at: string | null;
					notes: string | null;
					number: string;
					number_int: number | null;
					org_id: string;
					paid_at: string | null;
					payment_method: string | null;
					payment_terms: string | null;
					payment_url: string | null;
					pdf_hash: string | null;
					pdf_object_path: string | null;
					pdf_url: string | null;
					provider: string | null;
					provider_status: string | null;
					reminder_count: number | null;
					sent_at: string | null;
					status: string | null;
					subtotal_cents: number | null;
					subtotal_ex_vat: number;
					total_cents: number | null;
					total_inc_vat: number;
					ubl_url: string | null;
					updated_at: string | null;
					vat_amount_cents: number | null;
					vat_total: number;
					year: number | null;
				};
			};
			job_claim_due: {
				Args: { p_batch?: number };
				Returns: {
					attempts: number;
					external_id: string;
					id: string;
					invoice_id: string;
					max_attempts: number;
					provider: string;
				}[];
			};
			migrate_invoice_to_cents: {
				Args: Record<PropertyKey, never>;
				Returns: undefined;
			};
			record_webhook_event: {
				Args: {
					p_entity_id: string;
					p_entity_type: string;
					p_event_type: string;
					p_org_id?: string;
					p_provider: string;
					p_webhook_id: string;
				};
				Returns: undefined;
			};
			validate_invoice_draft_lines: {
				Args: { lines_json: Json } | { lines_json: Json };
				Returns: boolean;
			};
		};
		Enums: {
			[_ in never]: never;
		};
		CompositeTypes: {
			[_ in never]: never;
		};
	};
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
	keyof Database,
	"public"
>];

export type Tables<
	DefaultSchemaTableNameOrOptions extends
		| keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
		| { schema: keyof DatabaseWithoutInternals },
	TableName extends DefaultSchemaTableNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
				DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
		: never = never,
> = DefaultSchemaTableNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
			DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
			Row: infer R;
		}
		? R
		: never
	: DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
				DefaultSchema["Views"])
		? (DefaultSchema["Tables"] &
				DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
				Row: infer R;
			}
			? R
			: never
		: never;

export type TablesInsert<
	DefaultSchemaTableNameOrOptions extends
		| keyof DefaultSchema["Tables"]
		| { schema: keyof DatabaseWithoutInternals },
	TableName extends DefaultSchemaTableNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
		: never = never,
> = DefaultSchemaTableNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
			Insert: infer I;
		}
		? I
		: never
	: DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
		? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
				Insert: infer I;
			}
			? I
			: never
		: never;

export type TablesUpdate<
	DefaultSchemaTableNameOrOptions extends
		| keyof DefaultSchema["Tables"]
		| { schema: keyof DatabaseWithoutInternals },
	TableName extends DefaultSchemaTableNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
		: never = never,
> = DefaultSchemaTableNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
			Update: infer U;
		}
		? U
		: never
	: DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
		? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
				Update: infer U;
			}
			? U
			: never
		: never;

export type Enums<
	DefaultSchemaEnumNameOrOptions extends
		| keyof DefaultSchema["Enums"]
		| { schema: keyof DatabaseWithoutInternals },
	EnumName extends DefaultSchemaEnumNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
		: never = never,
> = DefaultSchemaEnumNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
	: DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
		? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
		: never;

export type CompositeTypes<
	PublicCompositeTypeNameOrOptions extends
		| keyof DefaultSchema["CompositeTypes"]
		| { schema: keyof DatabaseWithoutInternals },
	CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
		: never = never,
> = PublicCompositeTypeNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
	: PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
		? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
		: never;

export const Constants = {
	public: {
		Enums: {},
	},
} as const;
