# Task: issue-18 — Integrate SendGrid SDK for real email alert delivery

## Status: DONE

## Metadata
- **Type:** feature
- **Scope:** backend
- **Priority:** high
- **Source:** GitHub Issue #18

## Problem Statement
EmailNotifier currently only logs — it never calls SendGrid. The AlertDispatcher creates Alert records but never calls `self.notifier.send_alert()`. This issue integrates the SendGrid Python SDK, implements a real HTML email template with evidence, and wires AlertDispatcher.dispatch() to actually call the notifier.

## Acceptance Criteria
- [x] EmailNotifier.send_alert() sends real emails via SendGrid SDK when SENDGRID_API_KEY is configured
- [x] Email contains: subject with anomaly type + table, HTML body with comparison table, z-score, severity, recommendation
- [x] Email gracefully degrades when SENDGRID_API_KEY is missing (logs warning, returns sent status)
- [x] AlertDispatcher.dispatch() calls self.notifier.send_alert() for each alert created
- [x] SendGrid API errors are caught and reported as AlertStatus.failed with error_message
- [x] Unit tests mock SendGrid SDK and verify correct subject/to/body

## Technical Approach
**Decision:** Use `sendgrid` Python SDK wrapped in `asyncio.to_thread()` for async compatibility. Plain HTML string template inline (no Jinja2). AlertDispatcher resolves user email via anomaly chain query.

**Origin:** collaborative — based on issue spec + codebase analysis
**Rationale:** PROJECT_CONTEXT.md §2 specifies Python 3.13 + FastAPI + SendGrid for email alerts. The `sendgrid` SDK is the official library. `asyncio.to_thread()` keeps the FastAPI async pattern clean. Plain HTML avoids dependency on template engines.

## Architecture Fit
- **Layer:** Infrastructure (notifiers/email.py) + Application (alert_dispatcher.py)
- **Config:** SENDGRID_API_KEY and SENDGRID_FROM_EMAIL already exist in app/shared/config.py
- **Domain:** Alert model has `status` (sent/failed) and `error_message` fields ready for error tracking
- **Repository:** AlertRepository has `update_status()` method for marking failures

## Implementation Plan

### Tasks
- [x] Task 1: Add `sendgrid` dependency to pyproject.toml
- [x] Task 2: Implement real EmailNotifier.send_alert() with SendGrid SDK
  - Build HTML email body from anomaly data (type, description, deviation_details including expected/actual/zscore, severity)
  - Build subject: "[Beacon Alert] {severity}: {anomaly_type} anomaly in {data_source_name}"
  - Wrap SendGrid sync API in `asyncio.to_thread()`
  - Graceful degradation when SENDGRID_API_KEY is empty (log warning, return {"status": "sent"})
  - Catch SendGrid errors, log exception, return {"status": "failed", "error_message": str(e)}
  - Include recommendation text based on anomaly type
- [x] Task 3: Update EmailNotifier.send_alert() signature to accept optional data_source_name
- [x] Task 4: Wire AlertDispatcher.dispatch() to call self.notifier.send_alert()
  - Resolve user email from anomaly chain (anomaly → pipeline_run → pipeline → data_source → agent → user) using self.db
  - Resolve data_source_name from the same chain
  - Call self.notifier.send_alert() after alert creation
  - On notifier failure: set AlertStatus.failed + error_message
  - On notifier success: keep AlertStatus.sent
- [x] Task 5: Update unit tests in tests/application/test_alert_dispatcher.py
  - Update test_dispatch_sends_email to verify notifier.send_alert() is called
  - Update test_dispatch_alert_status_is_failed_on_error to expect AlertStatus.failed + error_message
  - Update test_alert_error_message_on_failure to assert error_message is populated
  - Add test for email subject/content verification (mock SendGrid SDK)
- [x] Task 6: Create new unit tests for EmailNotifier in tests/infrastructure/test_email_notifier.py
  - Test: send_alert builds correct HTML email body
  - Test: send_alert returns {"status": "sent"} when SENDGRID_API_KEY is empty
  - Test: send_alert returns {"status": "failed", "error_message": ...} on SendGrid error
  - Test: send_alert calls SendGrid SDK with correct to/from/subject/body
- [x] Task 7: Run ruff lint check on modified files
- [x] Task 8: Run all backend unit tests to verify

### Implementation Order
1. Add sendgrid dep (Task 1) — prerequisite for everything
2. Implement EmailNotifier (Tasks 2, 3) — core feature
3. Wire AlertDispatcher (Task 4) — integration
4. Write new tests (Tasks 5, 6) — verify
5. Lint + test run (Tasks 7, 8) — quality gates

### Files to Create/Modify
| File | Action | Purpose |
|------|--------|---------|
| pyproject.toml | MODIFY | Add `sendgrid` dependency |
| app/infrastructure/notifiers/email.py | MODIFY | Implement real SendGrid send_alert() |
| app/application/alert_dispatcher.py | MODIFY | Wire notifier call, resolve user email, handle errors |
| tests/application/test_alert_dispatcher.py | MODIFY | Update tests for new send behavior + failure status |
| tests/infrastructure/test_email_notifier.py | CREATE | New unit tests for EmailNotifier |

### API Contracts
N/A — internal module changes only.

### Database Changes
N/A — no schema changes. Alert model already has `status` and `error_message` columns.

## Testing Strategy
- **Unit tests:** Mock SendGrid SDK — verify correct subject, to, from, HTML body content. Verify graceful degradation (no API key). Verify error handling (SendGrid exception → failed status + error_message).
- **Integration tests:** Not applicable for this issue (would require real SendGrid API key).

## Risks and Considerations
- **SendGrid SDK sync:** Must wrap in `asyncio.to_thread()` to avoid blocking the async event loop
- **Rate limiting:** SendGrid free tier is 100 emails/day — implement simple cooldown or document as limitation
- **Email deliverability:** From email `alerts@beacon.app` must be verified in SendGrid dashboard before production use
- **User email resolution:** Anomaly chain join may be expensive — consider caching or eager loading in future sprint
- **Test instability:** Mock-based tests for async email flow need careful setup to avoid false positives

## Dependencies
- **External:** `sendgrid` Python package (SendGrid SDK v6+)
- **Internal:** None (self-contained notification layer change)

## Evidence (filled by tester/reviewer)
- **Test Log:** <path — filled after testing>
- **Coverage:** <path — filled after testing>
- **Security Scan:** <path — filled after review>
- **Review Verdict:** <APPROVED|CHANGES_REQUESTED — filled after review>

---
*Created by @orchestrator-nontdd*
*Last updated: 2026-06-10T00:00:00Z*
