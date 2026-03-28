


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."generate_school_code"() RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  next_val INTEGER;
  new_code TEXT;
BEGIN
  -- Get next value from sequence
  next_val := nextval('school_code_seq');
  -- Format as JS + 4 zero-padded digits
  new_code := 'JS' || LPAD(next_val::TEXT, 4, '0');
  -- Make sure it doesn't already exist (safety check)
  WHILE EXISTS (SELECT 1 FROM public.schools WHERE school_code = new_code) LOOP
    next_val := nextval('school_code_seq');
    new_code := 'JS' || LPAD(next_val::TEXT, 4, '0');
  END LOOP;
  RETURN new_code;
END;
$$;


ALTER FUNCTION "public"."generate_school_code"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admins
    WHERE admins.user_id = auth.uid()
    AND admins.is_active = true
  );
$$;


ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_super_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admins
    WHERE admins.user_id = auth.uid()
    AND admins.role = 'super_admin'
    AND admins.is_active = true
  );
$$;


ALTER FUNCTION "public"."is_super_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."send_school_code"("p_school_id" "uuid", "p_school_code" "text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  calling_user_id UUID;
  caller_role     TEXT;
  school_record   public.schools%ROWTYPE;
BEGIN
  -- Get calling user
  calling_user_id := auth.uid();

  -- Check caller is an active admin
  SELECT role INTO caller_role
  FROM public.admins
  WHERE user_id = calling_user_id AND is_active = true;

  IF caller_role IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorised. Admin access required.');
  END IF;

  -- Validate school exists
  SELECT * INTO school_record
  FROM public.schools
  WHERE id = p_school_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'School not found.');
  END IF;

  -- Validate code not empty
  IF TRIM(p_school_code) = '' THEN
    RETURN json_build_object('success', false, 'error', 'School code cannot be empty.');
  END IF;

  -- Update school record
  UPDATE public.schools
  SET
    school_code  = TRIM(p_school_code),
    code_sent    = true,
    code_sent_at = now(),
    status       = 'confirmed'
  WHERE id = p_school_id;

  -- Return updated school info for frontend to use in email/WhatsApp
  RETURN json_build_object(
    'success',                  true,
    'school_id',                school_record.id,
    'school_name',              school_record.school_name,
    'school_code',              TRIM(p_school_code),
    'email',                    school_record.email,
    'teacher_in_charge_name',   school_record.teacher_in_charge_name,
    'teacher_in_charge_phone',  school_record.teacher_in_charge_phone,
    'city',                     school_record.city,
    'location_type',            school_record.location_type
  );
END;
$$;


ALTER FUNCTION "public"."send_school_code"("p_school_id" "uuid", "p_school_code" "text") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."admins" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "name" "text" NOT NULL,
    "role" "text" DEFAULT 'manager'::"text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    CONSTRAINT "admins_role_check" CHECK (("role" = ANY (ARRAY['super_admin'::"text", 'manager'::"text"])))
);


ALTER TABLE "public"."admins" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."school_code_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."school_code_seq" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."schools" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_id" "uuid",
    "school_name" "text" NOT NULL,
    "address_line_1" "text" NOT NULL,
    "address_line_2" "text",
    "city" "text" NOT NULL,
    "location_type" "text" GENERATED ALWAYS AS (
CASE
    WHEN ("lower"(TRIM(BOTH FROM "city")) = 'lucknow'::"text") THEN 'local'::"text"
    ELSE 'outstation'::"text"
END) STORED,
    "teacher_in_charge_name" "text" NOT NULL,
    "teacher_in_charge_phone" "text" NOT NULL,
    "escort_teacher_name" "text" NOT NULL,
    "escort_teacher_phone" "text" NOT NULL,
    "email" "text" NOT NULL,
    "school_code" "text",
    "code_sent" boolean DEFAULT false NOT NULL,
    "code_sent_at" timestamp with time zone,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    CONSTRAINT "schools_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'confirmed'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."schools" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."team_edit_notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "school_id" "uuid" NOT NULL,
    "team_id" "uuid" NOT NULL,
    "school_name" "text" NOT NULL,
    "school_code" "text",
    "team_number" integer NOT NULL,
    "committee" "text" NOT NULL,
    "changes" "jsonb" NOT NULL,
    "changed_by" "text" NOT NULL,
    "is_read" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."team_edit_notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."teams" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "school_id" "uuid" NOT NULL,
    "committee" "text" NOT NULL,
    "team_number" integer NOT NULL,
    "participant_1_name" "text" NOT NULL,
    "participant_1_class" "text" NOT NULL,
    "participant_2_name" "text" NOT NULL,
    "participant_2_class" "text" NOT NULL,
    "participant_3_name" "text" NOT NULL,
    "participant_3_class" "text" NOT NULL,
    CONSTRAINT "teams_committee_check" CHECK (("committee" = ANY (ARRAY['ERT'::"text", 'SHC'::"text", 'TIF'::"text", 'PCC'::"text"]))),
    CONSTRAINT "teams_participant_1_class_check" CHECK (("participant_1_class" = ANY (ARRAY['8'::"text", '9'::"text", '10'::"text", '11'::"text", '12'::"text"]))),
    CONSTRAINT "teams_participant_2_class_check" CHECK (("participant_2_class" = ANY (ARRAY['8'::"text", '9'::"text", '10'::"text", '11'::"text", '12'::"text"]))),
    CONSTRAINT "teams_participant_3_class_check" CHECK (("participant_3_class" = ANY (ARRAY['8'::"text", '9'::"text", '10'::"text", '11'::"text", '12'::"text"])))
);


ALTER TABLE "public"."teams" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_schools_summary" AS
SELECT
    NULL::"uuid" AS "id",
    NULL::timestamp with time zone AS "created_at",
    NULL::"text" AS "school_name",
    NULL::"text" AS "city",
    NULL::"text" AS "location_type",
    NULL::"text" AS "teacher_in_charge_name",
    NULL::"text" AS "teacher_in_charge_phone",
    NULL::"text" AS "email",
    NULL::"text" AS "school_code",
    NULL::boolean AS "code_sent",
    NULL::timestamp with time zone AS "code_sent_at",
    NULL::"text" AS "status",
    NULL::bigint AS "total_teams",
    NULL::bigint AS "total_delegates",
    NULL::"text"[] AS "committees";


ALTER VIEW "public"."v_schools_summary" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_stats" AS
 SELECT "count"(DISTINCT "s"."id") AS "total_schools",
    "count"(DISTINCT "s"."id") FILTER (WHERE ("s"."location_type" = 'local'::"text")) AS "lucknow_schools",
    "count"(DISTINCT "s"."id") FILTER (WHERE ("s"."location_type" = 'outstation'::"text")) AS "outstation_schools",
    "count"(DISTINCT "t"."id") AS "total_teams",
    ("count"(DISTINCT "t"."id") * 3) AS "total_delegates",
    "count"(DISTINCT "t"."id") FILTER (WHERE ("t"."committee" = 'ERT'::"text")) AS "ert_teams",
    "count"(DISTINCT "t"."id") FILTER (WHERE ("t"."committee" = 'SHC'::"text")) AS "shc_teams",
    "count"(DISTINCT "t"."id") FILTER (WHERE ("t"."committee" = 'TIF'::"text")) AS "tif_teams",
    "count"(DISTINCT "t"."id") FILTER (WHERE ("t"."committee" = 'PCC'::"text")) AS "pcc_teams",
    "count"(DISTINCT "s"."id") FILTER (WHERE ("s"."status" = 'pending'::"text")) AS "pending_schools",
    "count"(DISTINCT "s"."id") FILTER (WHERE ("s"."status" = 'confirmed'::"text")) AS "confirmed_schools"
   FROM ("public"."schools" "s"
     LEFT JOIN "public"."teams" "t" ON (("t"."school_id" = "s"."id")));


ALTER VIEW "public"."v_stats" OWNER TO "postgres";


ALTER TABLE ONLY "public"."admins"
    ADD CONSTRAINT "admins_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."admins"
    ADD CONSTRAINT "admins_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admins"
    ADD CONSTRAINT "admins_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."schools"
    ADD CONSTRAINT "schools_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."schools"
    ADD CONSTRAINT "schools_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."schools"
    ADD CONSTRAINT "schools_school_code_key" UNIQUE ("school_code");



ALTER TABLE ONLY "public"."team_edit_notifications"
    ADD CONSTRAINT "team_edit_notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_school_id_team_number_key" UNIQUE ("school_id", "team_number");



CREATE INDEX "idx_admins_role" ON "public"."admins" USING "btree" ("role");



CREATE INDEX "idx_admins_user_id" ON "public"."admins" USING "btree" ("user_id");



CREATE INDEX "idx_schools_created_at" ON "public"."schools" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_schools_location_type" ON "public"."schools" USING "btree" ("location_type");



CREATE INDEX "idx_schools_status" ON "public"."schools" USING "btree" ("status");



CREATE INDEX "idx_schools_user_id" ON "public"."schools" USING "btree" ("user_id");



CREATE INDEX "idx_team_edit_notifs_created" ON "public"."team_edit_notifications" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_team_edit_notifs_school" ON "public"."team_edit_notifications" USING "btree" ("school_id");



CREATE INDEX "idx_team_edit_notifs_unread" ON "public"."team_edit_notifications" USING "btree" ("is_read") WHERE ("is_read" = false);



CREATE INDEX "idx_teams_committee" ON "public"."teams" USING "btree" ("committee");



CREATE INDEX "idx_teams_school_id" ON "public"."teams" USING "btree" ("school_id");



CREATE OR REPLACE VIEW "public"."v_schools_summary" AS
 SELECT "s"."id",
    "s"."created_at",
    "s"."school_name",
    "s"."city",
    "s"."location_type",
    "s"."teacher_in_charge_name",
    "s"."teacher_in_charge_phone",
    "s"."email",
    "s"."school_code",
    "s"."code_sent",
    "s"."code_sent_at",
    "s"."status",
    "count"(DISTINCT "t"."id") AS "total_teams",
    ("count"(DISTINCT "t"."id") * 3) AS "total_delegates",
    "array_agg"(DISTINCT "t"."committee") AS "committees"
   FROM ("public"."schools" "s"
     LEFT JOIN "public"."teams" "t" ON (("t"."school_id" = "s"."id")))
  GROUP BY "s"."id";



ALTER TABLE ONLY "public"."admins"
    ADD CONSTRAINT "admins_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."schools"
    ADD CONSTRAINT "schools_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."team_edit_notifications"
    ADD CONSTRAINT "team_edit_notifications_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."team_edit_notifications"
    ADD CONSTRAINT "team_edit_notifications_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE CASCADE;



CREATE POLICY "Alolow school registration" ON "public"."schools" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."admins" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "admins_delete" ON "public"."admins" FOR DELETE USING ("public"."is_super_admin"());



CREATE POLICY "admins_insert" ON "public"."admins" FOR INSERT WITH CHECK ("public"."is_super_admin"());



CREATE POLICY "admins_select" ON "public"."admins" FOR SELECT USING ("public"."is_admin"());



CREATE POLICY "admins_update" ON "public"."admins" FOR UPDATE USING ("public"."is_super_admin"());



CREATE POLICY "authenticated_select_notifications" ON "public"."team_edit_notifications" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "authenticated_update_notifications" ON "public"."team_edit_notifications" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "notif_insert_school" ON "public"."team_edit_notifications" FOR INSERT WITH CHECK (("school_id" IN ( SELECT "schools"."id"
   FROM "public"."schools"
  WHERE ("schools"."user_id" = "auth"."uid"()))));



CREATE POLICY "notif_select_admin" ON "public"."team_edit_notifications" FOR SELECT USING ("public"."is_admin"());



CREATE POLICY "notif_update_read" ON "public"."team_edit_notifications" FOR UPDATE USING ("public"."is_admin"());



ALTER TABLE "public"."schools" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "schools_delete_super_admin" ON "public"."schools" FOR DELETE USING ("public"."is_super_admin"());



CREATE POLICY "schools_insert_own" ON "public"."schools" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "schools_insert_own_notifications" ON "public"."team_edit_notifications" FOR INSERT WITH CHECK (("school_id" IN ( SELECT "schools"."id"
   FROM "public"."schools"
  WHERE ("schools"."user_id" = "auth"."uid"()))));



CREATE POLICY "schools_read_own_notifications" ON "public"."team_edit_notifications" FOR SELECT USING (("school_id" IN ( SELECT "schools"."id"
   FROM "public"."schools"
  WHERE ("schools"."user_id" = "auth"."uid"()))));



CREATE POLICY "schools_select_own" ON "public"."schools" FOR SELECT USING ((("auth"."uid"() = "user_id") OR "public"."is_admin"()));



CREATE POLICY "schools_update_admin_only" ON "public"."schools" FOR UPDATE USING ("public"."is_admin"());



ALTER TABLE "public"."team_edit_notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."teams" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "teams_delete_super_admin" ON "public"."teams" FOR DELETE USING ("public"."is_super_admin"());



CREATE POLICY "teams_insert_own" ON "public"."teams" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."schools"
  WHERE (("schools"."id" = "teams"."school_id") AND ("schools"."user_id" = "auth"."uid"())))));



CREATE POLICY "teams_select" ON "public"."teams" FOR SELECT USING (("public"."is_admin"() OR (EXISTS ( SELECT 1
   FROM "public"."schools"
  WHERE (("schools"."id" = "teams"."school_id") AND ("schools"."user_id" = "auth"."uid"()))))));



CREATE POLICY "teams_update_own_or_admin" ON "public"."teams" FOR UPDATE USING (("public"."is_admin"() OR ("school_id" IN ( SELECT "schools"."id"
   FROM "public"."schools"
  WHERE ("schools"."user_id" = "auth"."uid"())))));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."schools";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."team_edit_notifications";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."teams";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."generate_school_code"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_school_code"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_school_code"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_super_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_super_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_super_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."send_school_code"("p_school_id" "uuid", "p_school_code" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."send_school_code"("p_school_id" "uuid", "p_school_code" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."send_school_code"("p_school_id" "uuid", "p_school_code" "text") TO "service_role";


















GRANT ALL ON TABLE "public"."admins" TO "anon";
GRANT ALL ON TABLE "public"."admins" TO "authenticated";
GRANT ALL ON TABLE "public"."admins" TO "service_role";



GRANT ALL ON SEQUENCE "public"."school_code_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."school_code_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."school_code_seq" TO "service_role";



GRANT ALL ON TABLE "public"."schools" TO "anon";
GRANT ALL ON TABLE "public"."schools" TO "authenticated";
GRANT ALL ON TABLE "public"."schools" TO "service_role";



GRANT ALL ON TABLE "public"."team_edit_notifications" TO "anon";
GRANT ALL ON TABLE "public"."team_edit_notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."team_edit_notifications" TO "service_role";



GRANT ALL ON TABLE "public"."teams" TO "anon";
GRANT ALL ON TABLE "public"."teams" TO "authenticated";
GRANT ALL ON TABLE "public"."teams" TO "service_role";



GRANT ALL ON TABLE "public"."v_schools_summary" TO "anon";
GRANT ALL ON TABLE "public"."v_schools_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."v_schools_summary" TO "service_role";



GRANT ALL ON TABLE "public"."v_stats" TO "anon";
GRANT ALL ON TABLE "public"."v_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."v_stats" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































