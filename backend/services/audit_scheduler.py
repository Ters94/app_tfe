import io
import time
import json
import logging
import smtplib
from calendar import month_name, monthrange
from collections import defaultdict
from datetime import datetime, timezone, timedelta
from email.mime.application import MIMEApplication
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from bson import ObjectId
from pymongo import MongoClient

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle

from backend.config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

SMTP_HOST     = settings.SMTP_HOST
SMTP_PORT     = settings.SMTP_PORT
SMTP_USER     = settings.SMTP_USER
SMTP_PASSWORD = settings.SMTP_PASSWORD
APP_NAME      = getattr(settings, "APP_NAME", "ENGIE Queries")

ACTION_BG = {
    "REMOVE_MEMBER":  colors.HexColor("#fef2f2"),
    "DELETE_QUERY":   colors.HexColor("#fff7ed"),
    "UPDATE_QUERY":   colors.HexColor("#eff6ff"),
    "ADD_MEMBER":     colors.HexColor("#f0fdf4"),
    "CREATE_QUERY":   colors.HexColor("#f5f3ff"),
    "TRANSFER_OWNER": colors.HexColor("#fafafa"),
}
ACTION_FG = {
    "REMOVE_MEMBER":  colors.HexColor("#b91c1c"),
    "DELETE_QUERY":   colors.HexColor("#c2410c"),
    "UPDATE_QUERY":   colors.HexColor("#1d4ed8"),
    "ADD_MEMBER":     colors.HexColor("#15803d"),
    "CREATE_QUERY":   colors.HexColor("#6d28d9"),
    "TRANSFER_OWNER": colors.HexColor("#374151"),
}


def flatten_values(values: dict | None) -> str:
    if not values:
        return "—"
    lines = []
    for k, v in values.items():
        if isinstance(v, dict):
            lines.append(f"{k}:\n{json.dumps(v, indent=2, ensure_ascii=False)}")
        else:
            lines.append(f"{k}: {v}")
    return "\n".join(lines)


def generate_audit_pdf(group_name: str, audits: list[dict], month_label: str) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=landscape(A4),
        leftMargin=14 * mm, rightMargin=14 * mm,
        topMargin=16 * mm,  bottomMargin=16 * mm,
    )

    title_style = ParagraphStyle(
        "title", fontSize=16, fontName="Helvetica-Bold",
        textColor=colors.HexColor("#111827"), spaceAfter=4,
    )
    sub_style = ParagraphStyle(
        "sub", fontSize=10, fontName="Helvetica",
        textColor=colors.HexColor("#6b7280"), spaceAfter=2,
    )
    cell_style = ParagraphStyle(
        "cell", fontSize=8, fontName="Helvetica",
        textColor=colors.HexColor("#374151"), leading=11,
    )

    story = []
    story.append(Paragraph("Journal d'audit", title_style))
    story.append(Paragraph(f"Groupe : {group_name}", sub_style))
    story.append(Paragraph(
        f"Période : {month_label}  ·  Généré le {datetime.now().strftime('%d/%m/%Y %H:%M')}",
        sub_style,
    ))
    story.append(Spacer(1, 6 * mm))

    if not audits:
        story.append(Paragraph("Aucun audit pour cette période.", cell_style))
        doc.build(story)
        return buffer.getvalue()

    headers = ["Date", "Action", "Cible", "Utilisateur", "Anciennes valeurs", "Nouvelles valeurs"]
    rows = [headers]

    for audit in audits:
        ts = audit.get("timestamp", "")
        if isinstance(ts, datetime):
            ts = ts.strftime("%d/%m/%Y %H:%M")

        rows.append([
            Paragraph(str(ts), cell_style),
            Paragraph(str(audit.get("action", "")), cell_style),
            Paragraph(
                f"{audit.get('target_type', '')} - {audit.get('target_label', '')}",
                cell_style,
            ),
            Paragraph(str(audit.get("username") or audit.get("user_id", "")), cell_style),
            Paragraph(flatten_values(audit.get("old_values")), cell_style),
            Paragraph(flatten_values(audit.get("new_values")), cell_style),
        ])

    available = landscape(A4)[0] - 28 * mm
    fixed_mm  = (28 + 36 + 42 + 26) * mm
    auto_w    = (available - fixed_mm) / 2
    col_widths = [28*mm, 36*mm, 42*mm, 26*mm, auto_w, auto_w]

    table = Table(rows, colWidths=col_widths, repeatRows=1)

    base_style = [
        ("FONTNAME",       (0, 0), (-1, 0),  "Helvetica-Bold"),
        ("FONTSIZE",       (0, 0), (-1, -1), 8),
        ("TEXTCOLOR",      (0, 0), (-1, 0),  colors.HexColor("#6b7280")),
        ("BACKGROUND",     (0, 0), (-1, 0),  colors.HexColor("#f9fafb")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#fafafa")]),
        ("GRID",           (0, 0), (-1, -1), 0.3, colors.HexColor("#e5e7eb")),
        ("VALIGN",         (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING",     (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING",  (0, 0), (-1, -1), 5),
        ("LEFTPADDING",    (0, 0), (-1, -1), 6),
        ("RIGHTPADDING",   (0, 0), (-1, -1), 6),
    ]

    for i, audit in enumerate(audits, start=1):
        action = audit.get("action", "")
        base_style.append(("BACKGROUND", (1, i), (1, i), ACTION_BG.get(action, colors.white)))
        base_style.append(("TEXTCOLOR",  (1, i), (1, i), ACTION_FG.get(action, colors.HexColor("#374151"))))
        base_style.append(("FONTNAME",   (1, i), (1, i), "Helvetica-Bold"))

    table.setStyle(TableStyle(base_style))
    story.append(table)

    def footer(canvas, doc):
        canvas.saveState()
        canvas.setFont("Helvetica", 7)
        canvas.setFillColor(colors.HexColor("#9ca3af"))
        canvas.drawCentredString(
            landscape(A4)[0] / 2,
            10 * mm,
            f"Page {doc.page}  ·  {APP_NAME}  ·  {group_name}",
        )
        canvas.restoreState()

    doc.build(story, onFirstPage=footer, onLaterPages=footer)
    return buffer.getvalue()


def send_audit_email(
    owner_email: str,
    owner_name: str,
    month_label: str,
    attachments: list[tuple[str, bytes]],
    custom_note: str | None = None,
) -> None:
    msg = MIMEMultipart()
    msg["From"]    = f"{APP_NAME} <{SMTP_USER}>"
    msg["To"]      = owner_email
    msg["Subject"] = f"[{APP_NAME}] Journal d'audit – {month_label}"

    nb_groups  = len(attachments)
    group_list = "\n".join(f"  • {fname.replace('.pdf', '')}" for fname, _ in attachments)

    footer_line = custom_note if custom_note else "Ce rapport est généré automatiquement le dernier jour de chaque mois."

    body = (
        f"Bonjour {owner_name},\n\n"
        f"Veuillez trouver ci-joint le(s) journal(aux) d'audit du mois de {month_label} "
        f"pour les {nb_groups} groupe(s) dont vous êtes responsable :\n\n"
        f"{group_list}\n\n"
        f"{footer_line}\n\n"
        f"Cordialement,\nL'équipe {APP_NAME}\n"
    )
    msg.attach(MIMEText(body, "plain", "utf-8"))

    for filename, pdf_bytes in attachments:
        part = MIMEApplication(pdf_bytes, Name=filename)
        part["Content-Disposition"] = f'attachment; filename="{filename}"'
        msg.attach(part)

    with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
        server.ehlo()
        server.starttls()
        server.login(SMTP_USER, SMTP_PASSWORD)
        server.sendmail(SMTP_USER, owner_email, msg.as_string())

    logger.info(f"Email envoyé à {owner_email} ({nb_groups} PDF(s))")


def send_monthly_audit_reports() -> None:
    now         = datetime.now(tz=timezone.utc)
    month       = now.month
    year        = now.year
    month_label = f"{month_name[month]} {year}"

    logger.info(f"Démarrage envoi rapports audit — {month_label}")

    mongo_client = MongoClient(settings.MONGO_URI)
    db           = mongo_client[settings.DATABASE_NAME]

    groups_col = db["groups"]
    users_col  = db["users"]
    audits_col = db["audits"]

    try:
        groups = list(groups_col.find({"status": True}))

        if not groups:
            logger.info("Aucun groupe actif trouvé.")
            return

        owner_ids  = list({g["owner_id"] for g in groups if g.get("owner_id")})
        owner_docs = list(users_col.find(
            {"_id": {"$in": [ObjectId(oid) for oid in owner_ids]}}
        ))

        owners: dict[str, dict] = {
            str(u["_id"]): {
                "username": u.get("username", ""),
                "email":    u.get("email", ""),
                "name":     f"{u.get('name', '')} {u.get('lastname', '')}".strip(),
            }
            for u in owner_docs
        }

        _, last_day = monthrange(year, month)
        start_dt = datetime(year, month, 1,        0,  0,  0, tzinfo=timezone.utc)
        end_dt   = datetime(year, month, last_day, 23, 59, 59, tzinfo=timezone.utc)

        owner_groups: dict[str, list] = defaultdict(list)

        for group in groups:
            owner_id = group.get("owner_id")
            if not owner_id or owner_id not in owners:
                logger.warning(f"Groupe '{group.get('name')}' sans owner valide, ignoré.")
                continue

            owner    = owners[owner_id]
            group_id = str(group["_id"])

            audit_docs = list(audits_col.find({
                "group_id":  group_id,
                "timestamp": {"$gte": start_dt, "$lte": end_dt},
            }).sort("timestamp", -1))

            enriched   = []
            user_cache: dict[str, str] = {}

            for a in audit_docs:
                uid = a.get("user_id", "")
                if uid and uid not in user_cache:
                    u = users_col.find_one({"_id": ObjectId(uid)}, {"username": 1})
                    user_cache[uid] = u.get("username", "") if u else ""

                enriched.append({
                    "timestamp":    a.get("timestamp"),
                    "action":       a.get("action", ""),
                    "target_type":  a.get("target_type", ""),
                    "target_label": a.get("target_label", ""),
                    "user_id":      uid,
                    "username":     user_cache.get(uid, ""),
                    "old_values":   a.get("old_values"),
                    "new_values":   a.get("new_values"),
                })

            owner_groups[owner["email"]].append({
                "owner_name": owner["name"] or owner["username"],
                "group_name": group.get("name", ""),
                "audits":     enriched,
            })

        if not owner_groups:
            logger.info("Aucun audit à envoyer ce mois-ci.")
            return

        for owner_email, group_data in owner_groups.items():
            owner_name  = group_data[0]["owner_name"]
            attachments = []

            for gd in group_data:
                pdf_bytes = generate_audit_pdf(
                    group_name  = gd["group_name"],
                    audits      = gd["audits"],
                    month_label = month_label,
                )
                safe_name = gd["group_name"].replace(" ", "_").replace("/", "-")
                filename  = f"audit_{safe_name}_{month:02d}-{year}.pdf"
                attachments.append((filename, pdf_bytes))

            try:
                send_audit_email(
                    owner_email = owner_email,
                    owner_name  = owner_name,
                    month_label = month_label,
                    attachments = attachments,
                )
                time.sleep(2)
            except Exception as e:
                logger.error(f"Échec envoi email à {owner_email} : {e}")

    finally:
        mongo_client.close()

    logger.info("Envoi des rapports terminé.")


def start_scheduler() -> AsyncIOScheduler:
    scheduler = AsyncIOScheduler(timezone="Europe/Paris")

    #run_at  = datetime.now() + timedelta(minutes=2)
    #trigger = CronTrigger(hour=run_at.hour, minute=run_at.minute)
    trigger = CronTrigger(day="last", hour=8, minute=0)

    scheduler.add_job(
        send_monthly_audit_reports,
        trigger          = trigger,
        id               = "monthly_audit_report",
        name             = "Envoi mensuel des journaux d'audit",
        replace_existing = True,
    )
    scheduler.start()
    logger.info("Scheduler démarré — envoi le dernier jour de chaque mois à 08h00 (Europe/Paris)")
    return scheduler