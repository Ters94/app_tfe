from io import BytesIO
from datetime import datetime
from bson import ObjectId
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle
)
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.pagesizes import A4
from backend.database import db


def format_date(value):
    if isinstance(value, datetime):
        return value.strftime("%d/%m/%Y %H:%M")
    return str(value)


def format_values(values: dict | None):
    if not values:
        return "-"

    lines = []

    for key, value in values.items():
        if isinstance(value, dict):
            sub_values = ", ".join([f"{k}: {v}" for k, v in value.items()])
            lines.append(f"{key}: {sub_values}")
        else:
            lines.append(f"{key}: {value}")

    return "<br/>".join(lines)


def get_username(user_id: str):
    if user_id and ObjectId.is_valid(user_id):
        user = db.users.find_one({"_id": ObjectId(user_id)})
        if user:
            return user.get("username") or user.get("name") or "Unknown"

    return "Unknown"

def generate_audit_pdf(group_name: str, audits: list):
    buffer = BytesIO()

    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=25,
        leftMargin=25,
        topMargin=30,
        bottomMargin=30
    )

    styles = getSampleStyleSheet()
    elements = []

    title = Paragraph(
        f"Audit Report - {group_name}",
        styles['Title']
    )

    elements.append(title)
    elements.append(Spacer(1, 12))

    total_audits = len(audits)
    total_queries = len([a for a in audits if a.get("target_type") == "QUERY"])
    total_memberships = len([a for a in audits if a.get("target_type") == "MEMBERSHIP"])
    total_groups = len([a for a in audits if a.get("target_type") == "GROUP"])

    elements.append(Paragraph(f"<b>Total actions:</b> {total_audits}", styles["Normal"]))
    elements.append(Paragraph(f"<b>Query actions:</b> {total_queries}", styles["Normal"]))
    elements.append(Paragraph(f"<b>Membership actions:</b> {total_memberships}", styles["Normal"]))
    elements.append(Paragraph(f"<b>Group actions:</b> {total_groups}", styles["Normal"]))

    elements.append(Spacer(1, 18))

    data = [
        [
            "Date",
            "Action",
            "User",
            "Target",
            "old values",
            "new values"
        ]
    ]

    for audit in audits:
        username = get_username(audit.get("user_id"))
        data.append([
            Paragraph(format_date(audit.get("timestamp")), styles["Normal"]),
            Paragraph(audit.get("action", ""), styles["Normal"]),
            Paragraph(username, styles["Normal"]),
            Paragraph(audit.get("target_label") or "", styles["Normal"]),
            Paragraph(format_values(audit.get("old_values")), styles["Normal"]),
            Paragraph(format_values(audit.get("new_values")), styles["Normal"]),
        ])


    table = Table(
        data,
        repeatRows=1,colWidths=[65, 75, 60, 70, 135, 135])

    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#1f2937")),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ("FONTSIZE", (0, 0), (-1, 0), 8),

        ("FONTSIZE", (0, 1), (-1, -1), 7),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ('GRID', (0, 0), (-1, -1), 1, colors.black),


        ('BOTTOMPADDING', (0, 0), (-1, 0), 10),

        ('BACKGROUND', (0, 1), (-1, -1), colors.whitesmoke),
         ("TOPPADDING", (0, 1), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 1), (-1, -1), 6),
    ]))

    elements.append(table)

    doc.build(elements)

    buffer.seek(0)

    return buffer