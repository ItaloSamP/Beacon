import asyncio
import logging

from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import From, HtmlContent, Mail, Subject, To

from app.shared.config import settings

logger = logging.getLogger(__name__)


def _severity_badge(severity: str) -> str:
    colors = {
        "critical": "#dc2626",
        "high": "#ea580c",
        "medium": "#ca8a04",
        "low": "#16a34a",
    }
    color = colors.get(severity.lower(), "#6b7280")
    return (
        f'<span style="display:inline-block;padding:2px 10px;'
        f"border-radius:12px;background:{color};color:#fff;"
        f'font-size:13px;font-weight:600;text-transform:uppercase">{severity}</span>'
    )


def _recommendation(anomaly_type: str) -> str:
    recs = {
        "volume": (
            "Investigate the data pipeline ingestion for this table. "
            "Check for upstream source failures, stuck ETL jobs, or "
            "recent changes to ingestion schedules."
        ),
        "null_check": (
            "Verify source system connectivity and data completeness. "
            "A rise in null values may indicate a failed column mapping, "
            "truncated export, or schema change in the upstream source."
        ),
        "schema_change": (
            "Review recent DDL changes on the data source. "
            "Schema changes can break downstream pipelines — confirm "
            "this change was intentional and update dependent jobs."
        ),
        "distribution": (
            "Review the distribution shift. This may indicate a data "
            "quality issue, a change in business logic, or a gradual "
            "drift in upstream data patterns."
        ),
    }
    return recs.get(
        anomaly_type,
        "Review the anomaly details and investigate the data source "
        "for potential quality issues or configuration changes.",
    )


def _build_html_body(anomaly, data_source_name: str = "Unknown") -> str:
    details = getattr(anomaly, "deviation_details", None) or {}
    expected = details.get("expected", "N/A")
    actual = details.get("actual", "N/A")
    zscore = details.get("zscore", "N/A")

    if isinstance(zscore, (int, float)):
        zscore = f"{zscore:.2f}"

    severity = getattr(anomaly, "severity", None)
    severity_str = severity.value if hasattr(severity, "value") else str(severity or "unknown")
    anomaly_type = getattr(anomaly, "type", "unknown")
    description = getattr(anomaly, "description", "No description provided.")

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;font-family:'Inter',-apple-system,BlinkMacSystemFont,sans-serif;background:#f8fafc">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 0">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1)">
  <!-- Header -->
  <tr>
    <td style="background:#1e293b;padding:32px 40px">
      <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700">Beacon Alert</h1>
      <p style="margin:8px 0 0;color:#94a3b8;font-size:14px">Data quality anomaly detected</p>
    </td>
  </tr>
  <!-- Severity + Type -->
  <tr>
    <td style="padding:28px 40px 16px">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td>{_severity_badge(severity_str)}</td>
          <td align="right" style="color:#64748b;font-size:14px;text-transform:capitalize">{anomaly_type} anomaly</td>
        </tr>
      </table>
    </td>
  </tr>
  <!-- Description -->
  <tr>
    <td style="padding:0 40px 8px">
      <p style="margin:0;color:#334155;font-size:15px;line-height:1.6"><strong>Data Source:</strong> {data_source_name}</p>
      <p style="margin:12px 0 0;color:#475569;font-size:14px;line-height:1.6">{description}</p>
    </td>
  </tr>
  <!-- Comparison Table -->
  <tr>
    <td style="padding:24px 40px">
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden">
        <tr style="background:#f1f5f9">
          <th style="padding:12px 16px;text-align:left;font-size:13px;color:#475569;font-weight:600">Metric</th>
          <th style="padding:12px 16px;text-align:right;font-size:13px;color:#475569;font-weight:600">Expected</th>
          <th style="padding:12px 16px;text-align:right;font-size:13px;color:#475569;font-weight:600">Actual</th>
        </tr>
        <tr>
          <td style="padding:12px 16px;font-size:14px;color:#334155;border-top:1px solid #f1f5f9">Value</td>
          <td style="padding:12px 16px;font-size:14px;color:#334155;text-align:right;border-top:1px solid #f1f5f9">{expected}</td>
          <td style="padding:12px 16px;font-size:14px;color:#dc2626;text-align:right;border-top:1px solid #f1f5f9;font-weight:600">{actual}</td>
        </tr>
        <tr style="background:#fefce8">
          <td style="padding:12px 16px;font-size:14px;color:#334155">Z-Score</td>
          <td colspan="2" style="padding:12px 16px;font-size:14px;color:#ca8a04;text-align:right;font-weight:600">{zscore}</td>
        </tr>
      </table>
    </td>
  </tr>
  <!-- Recommendation -->
  <tr>
    <td style="padding:8px 40px 32px">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#eff6ff;border-radius:8px;border-left:4px solid #3b82f6">
        <tr>
          <td style="padding:16px 20px">
            <p style="margin:0 0 4px;color:#1e40af;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px">Recommended Action</p>
            <p style="margin:0;color:#1e3a5f;font-size:14px;line-height:1.6">{_recommendation(anomaly_type)}</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
  <!-- Footer -->
  <tr>
    <td style="background:#f8fafc;padding:20px 40px;border-top:1px solid #e2e8f0">
      <p style="margin:0;color:#94a3b8;font-size:12px">This is an automated alert from Beacon. View details in your <a href="https://beacon.app/dashboard" style="color:#3b82f6">dashboard</a>.</p>
    </td>
  </tr>
</table>
</td></tr>
</table>
</body>
</html>"""


def _build_subject(anomaly, data_source_name: str = "Unknown") -> str:
    severity = getattr(anomaly, "severity", None)
    severity_str = severity.value if hasattr(severity, "value") else str(severity or "unknown")
    anomaly_type = getattr(anomaly, "type", "unknown")
    return (
        f"[Beacon Alert] {severity_str.upper()}: "
        f"{anomaly_type} anomaly in {data_source_name}"
    )


class EmailNotifier:
    def __init__(self, api_key=None, from_email=None):
        self.api_key = api_key or settings.SENDGRID_API_KEY
        self.from_email = from_email or settings.SENDGRID_FROM_EMAIL

    async def send_alert(
        self, anomaly, to_email: str, data_source_name: str = "Unknown"
    ) -> dict:
        if not self.api_key:
            logger.warning(
                "SendGrid not configured. Alert would have been sent to %s", to_email
            )
            return {"status": "sent"}

        subject = _build_subject(anomaly, data_source_name)
        html_body = _build_html_body(anomaly, data_source_name)

        message = Mail(
            from_email=From(self.from_email),
            to_emails=To(to_email),
            subject=Subject(subject),
            html_content=HtmlContent(html_body),
        )

        try:
            sg = SendGridAPIClient(self.api_key)
            response = await asyncio.to_thread(sg.send, message)
            logger.info(
                "Alert email sent to %s for anomaly %s — status %d",
                to_email,
                getattr(anomaly, "id", "unknown"),
                response.status_code,
            )
            return {"status": "sent"}
        except Exception as e:
            logger.error(
                "Failed to send alert email to %s: %s", to_email, str(e)
            )
            return {"status": "failed", "error_message": str(e)}
