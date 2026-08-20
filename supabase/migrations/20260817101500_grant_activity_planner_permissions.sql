GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "public"."activity_planner" TO "authenticated";
GRANT ALL ON TABLE "public"."activity_planner" TO "service_role";

GRANT SELECT ON TABLE "public"."activity_planner_reminder_delivery" TO "authenticated";
GRANT ALL ON TABLE "public"."activity_planner_reminder_delivery" TO "service_role";

GRANT ALL ON SEQUENCE "public"."activity_planner_reminder_delivery_id_seq" TO "service_role";
