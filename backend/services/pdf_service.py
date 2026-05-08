from io import BytesIO
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


def generate_audit_pdf(group_name: str, audits: list):
    buffer = BytesIO()

    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4
    )

    styles = getSampleStyleSheet()
    elements = []

    title = Paragraph(
        f"Audit Report - {group_name}",
        styles['Title']
    )

    elements.append(title)
    elements.append(Spacer(1, 20))

    data = [
        [
            "Date",
            "Action",
            "User",
            "Target"
        ]
    ]

    for audit in audits:
        data.append([
            str(audit.get("timestamp", "")),
            audit.get("action", ""),
            str(audit.get("user_id", "")),
            audit.get("target_label", "")
        ])

    table = Table(data, repeatRows=1)

    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#1f2937")),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),

        ('GRID', (0, 0), (-1, -1), 1, colors.black),

        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),

        ('BOTTOMPADDING', (0, 0), (-1, 0), 10),

        ('BACKGROUND', (0, 1), (-1, -1), colors.whitesmoke),
    ]))

    elements.append(table)

    doc.build(elements)

    buffer.seek(0)

    return buffer