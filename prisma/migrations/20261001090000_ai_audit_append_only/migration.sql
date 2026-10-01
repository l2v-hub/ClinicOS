-- Phase 6 (audit integrity): AiAuditEvent is append-only at the DATABASE level, not only by
-- convention. Rows can be inserted; UPDATE, DELETE and TRUNCATE are refused. A legitimate
-- retention/erasure job must be an explicit, reviewed DBA procedure (disable trigger in a
-- maintenance transaction) — never application code.
CREATE FUNCTION clinicos_ai_audit_append_only() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'AiAuditEvent is append-only (% refused)', TG_OP USING ERRCODE = '23514';
END;
$$;

CREATE TRIGGER "AiAuditEvent_no_update" BEFORE UPDATE ON "AiAuditEvent"
  FOR EACH ROW EXECUTE FUNCTION clinicos_ai_audit_append_only();
CREATE TRIGGER "AiAuditEvent_no_delete" BEFORE DELETE ON "AiAuditEvent"
  FOR EACH ROW EXECUTE FUNCTION clinicos_ai_audit_append_only();
CREATE TRIGGER "AiAuditEvent_no_truncate" BEFORE TRUNCATE ON "AiAuditEvent"
  FOR EACH STATEMENT EXECUTE FUNCTION clinicos_ai_audit_append_only();
