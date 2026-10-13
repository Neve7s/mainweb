CREATE TABLE "clients" (
	"id" text PRIMARY KEY NOT NULL,
	"compania" text NOT NULL,
	"url" text,
	"icono" text,
	"order" integer DEFAULT 0 NOT NULL,
	"published" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contact_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"message" text NOT NULL,
	"source" text DEFAULT 'footer' NOT NULL,
	"lang" text DEFAULT 'es' NOT NULL,
	"status" text DEFAULT 'new' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "contact_messages_status_check" CHECK ("contact_messages"."status" IN ('new','read','replied','archived'))
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"type" text NOT NULL,
	"title_es" text NOT NULL,
	"title_en" text NOT NULL,
	"excerpt_es" text NOT NULL,
	"excerpt_en" text NOT NULL,
	"content_md_es" text NOT NULL,
	"content_md_en" text NOT NULL,
	"cover" text,
	"cover_id" text,
	"imagenes" text[] NOT NULL,
	"imagen_ids" text[] NOT NULL,
	"tags" text[] NOT NULL,
	"published" boolean DEFAULT false NOT NULL,
	"published_at" timestamp,
	"author" text DEFAULT 'HieysoN' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "posts_slug_unique" UNIQUE("slug"),
	CONSTRAINT "posts_type_check" CHECK ("posts"."type" IN ('blog','noticia'))
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"categoria_es" text NOT NULL,
	"categoria_en" text NOT NULL,
	"tecnologias" text[] NOT NULL,
	"tecnologias_listado_es" text NOT NULL,
	"tecnologias_listado_en" text NOT NULL,
	"titulo_listado_es" text NOT NULL,
	"titulo_listado_en" text NOT NULL,
	"descripcion_listado_es" text NOT NULL,
	"descripcion_listado_en" text NOT NULL,
	"descripcion_full_es" text NOT NULL,
	"descripcion_full_en" text NOT NULL,
	"url" text,
	"imagenes" text[] NOT NULL,
	"imagen_ids" text[] NOT NULL,
	"tags" text[] NOT NULL,
	"stack" text[] NOT NULL,
	"servicios_rel" text[] NOT NULL,
	"logros" text[] NOT NULL,
	"destacado" boolean DEFAULT false NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"published" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "projects_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"icon" text DEFAULT 'terminal' NOT NULL,
	"category_es" text NOT NULL,
	"category_en" text NOT NULL,
	"title_es" text NOT NULL,
	"title_en" text NOT NULL,
	"human_title_es" text NOT NULL,
	"human_title_en" text NOT NULL,
	"desc_es" text NOT NULL,
	"desc_en" text NOT NULL,
	"examples" jsonb NOT NULL,
	"cta_heading_es" text NOT NULL,
	"cta_heading_en" text NOT NULL,
	"cta_desc_es" text NOT NULL,
	"cta_desc_en" text NOT NULL,
	"cta_button_es" text NOT NULL,
	"cta_button_en" text NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"published" boolean DEFAULT true NOT NULL,
	CONSTRAINT "services_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "site_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "testimonials" (
	"id" text PRIMARY KEY NOT NULL,
	"compania" text NOT NULL,
	"url" text,
	"foto" text,
	"nombre" text NOT NULL,
	"email" text,
	"telefono" text,
	"mensaje_es" text NOT NULL,
	"mensaje_en" text NOT NULL,
	"rating" integer DEFAULT 5 NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"published" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE INDEX "contact_messages_status_idx" ON "contact_messages" USING btree ("status");--> statement-breakpoint
CREATE INDEX "posts_type_published_idx" ON "posts" USING btree ("type","published");--> statement-breakpoint
CREATE INDEX "posts_published_at_idx" ON "posts" USING btree ("published_at");