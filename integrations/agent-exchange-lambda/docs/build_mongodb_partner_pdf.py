from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    HRFlowable,
    Image,
    KeepTogether,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "PrivateDAO-MongoDB-Partner-Program-Submission.pdf"
LOGO = Path("/home/x-pact/Downloads/WhatsApp Image 2026-09-21 at 9.30.53 AM.jpeg")
if not LOGO.exists():
    LOGO = ROOT / "../../assets/brand/privatedao-avatar-1024.png"

NAVY = colors.HexColor("#071A32")
INK = colors.HexColor("#102640")
MUTED = colors.HexColor("#52657B")
LINE = colors.HexColor("#D8E3EF")
PALE = colors.HexColor("#F4F8FC")
BLUE = colors.HexColor("#1769E0")
CYAN = colors.HexColor("#10BCEB")
GREEN = colors.HexColor("#0A8F67")


styles = getSampleStyleSheet()
styles.add(ParagraphStyle(
    name="CoverKicker", parent=styles["Normal"], fontName="Helvetica-Bold",
    fontSize=9, leading=12, textColor=BLUE, tracking=1.3, spaceAfter=8,
))
styles.add(ParagraphStyle(
    name="CoverTitle", parent=styles["Title"], fontName="Helvetica-Bold",
    fontSize=30, leading=34, textColor=NAVY, alignment=TA_LEFT,
    spaceAfter=10,
))
styles.add(ParagraphStyle(
    name="CoverLead", parent=styles["Normal"], fontName="Helvetica",
    fontSize=13, leading=19, textColor=MUTED, spaceAfter=10,
))
styles.add(ParagraphStyle(
    name="H1P", parent=styles["Heading1"], fontName="Helvetica-Bold",
    fontSize=21, leading=25, textColor=NAVY, spaceBefore=2, spaceAfter=10,
))
styles.add(ParagraphStyle(
    name="H2P", parent=styles["Heading2"], fontName="Helvetica-Bold",
    fontSize=12.5, leading=16, textColor=INK, spaceBefore=10, spaceAfter=5,
))
styles.add(ParagraphStyle(
    name="BodyP", parent=styles["BodyText"], fontName="Helvetica",
    fontSize=9.3, leading=14, textColor=INK, spaceAfter=7,
))
styles.add(ParagraphStyle(
    name="SmallP", parent=styles["BodyText"], fontName="Helvetica",
    fontSize=7.8, leading=10.5, textColor=MUTED, spaceAfter=4,
))
styles.add(ParagraphStyle(
    name="BulletP", parent=styles["BodyText"], fontName="Helvetica",
    fontSize=9.1, leading=13.5, leftIndent=12, firstLineIndent=-7,
    textColor=INK, spaceAfter=4,
))
styles.add(ParagraphStyle(
    name="CalloutP", parent=styles["BodyText"], fontName="Helvetica-Bold",
    fontSize=10, leading=14, textColor=NAVY, spaceAfter=0,
))
styles.add(ParagraphStyle(
    name="TableHead", parent=styles["BodyText"], fontName="Helvetica-Bold",
    fontSize=8, leading=10, textColor=colors.white,
))
styles.add(ParagraphStyle(
    name="TableCell", parent=styles["BodyText"], fontName="Helvetica",
    fontSize=7.7, leading=10.2, textColor=INK,
))
styles.add(ParagraphStyle(
    name="TableCellGreen", parent=styles["BodyText"], fontName="Helvetica-Bold",
    fontSize=7.7, leading=10.2, textColor=GREEN,
))


def P(text, style="BodyP"):
    return Paragraph(text, styles[style])


def bullet(text):
    return P(f"• {text}", "BulletP")


def section_title(number, title):
    return [P(f"{number} / {title.upper()}", "CoverKicker"), P(title, "H1P")]


def card(title, body, width=82 * mm):
    table = Table([[P(title, "H2P")], [P(body, "BodyP")]], colWidths=[width])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), PALE),
        ("BOX", (0, 0), (-1, -1), 0.6, LINE),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    return table


def page_chrome(canvas, doc):
    canvas.saveState()
    width, height = A4
    canvas.setFillColor(NAVY)
    canvas.rect(0, height - 7 * mm, width, 7 * mm, stroke=0, fill=1)
    if doc.page > 1:
        canvas.setFillColor(MUTED)
        canvas.setFont("Helvetica", 7)
        canvas.drawString(18 * mm, 11 * mm, "PrivateDAO  |  MongoDB Partner Program Submission")
        canvas.drawRightString(width - 18 * mm, 11 * mm, f"{doc.page}")
        canvas.setStrokeColor(LINE)
        canvas.line(18 * mm, 15 * mm, width - 18 * mm, 15 * mm)
    canvas.restoreState()


def build():
    OUT.parent.mkdir(parents=True, exist_ok=True)
    doc = SimpleDocTemplate(
        str(OUT), pagesize=A4, rightMargin=18 * mm, leftMargin=18 * mm,
        topMargin=19 * mm, bottomMargin=20 * mm, title="PrivateDAO MongoDB Partner Program Submission",
        author="PrivateDAO",
    )
    story = []

    # Cover
    story.append(Spacer(1, 12 * mm))
    if LOGO.exists():
        logo = Image(str(LOGO), width=48 * mm, height=48 * mm)
        logo.hAlign = "LEFT"
        story.append(logo)
        story.append(Spacer(1, 8 * mm))
    story.append(P("PARTNER PROGRAM APPLICATION BRIEF", "CoverKicker"))
    story.append(P("PrivateDAO × MongoDB", "CoverTitle"))
    story.append(P("Private decisions. Verifiable outcomes.", "CoverLead"))
    story.append(P(
        "A concise technical and product brief describing PrivateDAO and the production "
        "Agents.PrivateDAO.org exchange, prepared for MongoDB partner-program review.",
        "CoverLead",
    ))
    story.append(Spacer(1, 7 * mm))
    story.append(HRFlowable(width="100%", thickness=1.2, color=CYAN, spaceAfter=12))
    cover_data = [
        [P("ORGANIZATION", "SmallP"), P("PrivateDAO", "CalloutP")],
        [P("PRODUCT", "SmallP"), P("PrivateDAO Agent Exchange", "CalloutP")],
        [P("PRODUCTION SURFACE", "SmallP"), P("https://agents.privatedao.org", "CalloutP")],
        [P("DOCUMENT STATUS", "SmallP"), P("Application brief • 24 September 2026", "CalloutP")],
    ]
    cover_table = Table(cover_data, colWidths=[45 * mm, 115 * mm])
    cover_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LINEBELOW", (0, 0), (-1, -2), 0.4, LINE),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
    ]))
    story.append(cover_table)
    story.append(Spacer(1, 18 * mm))
    story.append(P(
        "Status note: PrivateDAO records accepted participation in the MongoDB Partner Program and "
        "MongoDB for Startups. This document describes the production integration without claiming "
        "MongoDB endorsement, certification, or joint ownership of the PrivateDAO product.", "SmallP",
    ))

    # 1
    story.append(PageBreak())
    story.extend(section_title("01", "Executive summary"))
    story.append(P(
        "PrivateDAO is building infrastructure for agents and organizations that need confidential "
        "coordination with outcomes that can be independently verified. The production Agent Exchange "
        "at <b>agents.privatedao.org</b> exposes machine-native services for verification, evidence, "
        "repository provenance, agent workflows, and settlement-aware execution.",
    ))
    story.append(P(
        "MongoDB Atlas is integrated as the evidence-history and search layer. When a job completes, "
        "the runtime writes an idempotent evidence document containing the job identity, service, input "
        "hash, result, completion timestamp, and provider provenance. Core job/payment state remains in "
        "DynamoDB; MongoDB is deliberately scoped to evidence history rather than custody or payment accounting.",
    ))
    story.append(Spacer(1, 3 * mm))
    story.append(Table([
        [card("The problem", "Autonomous systems need a reliable way to coordinate actions while preserving privacy, provenance, and verifiable completion."),
         card("The product", "A public, machine-native exchange where agents discover capabilities, submit structured jobs, and receive receipts with evidence hashes." )],
        [card("Why MongoDB", "Document-shaped evidence evolves with heterogeneous agent outputs and supports indexed history/search without exposing database credentials to clients."),
         card("The opportunity", "A practical technology-partner story around Atlas-powered evidence infrastructure for agentic workflows and confidential coordination.")],
    ], colWidths=[88 * mm, 88 * mm], rowHeights=[None, None], hAlign="LEFT"),)
    story.append(Spacer(1, 6 * mm))
    story.append(P("Current public product surfaces", "H2P"))
    for text in [
        "A2A discovery: <b>https://agents.privatedao.org/a2a</b>",
        "Remote MCP: <b>https://agents.privatedao.org/mcp</b>",
        "Agent card: <b>https://agents.privatedao.org/.well-known/agent-card.json</b>",
        "Service catalog and REST API: <b>https://agents.privatedao.org/api/services</b>",
    ]:
        story.append(bullet(text))

    # 2
    story.append(PageBreak())
    story.extend(section_title("02", "PrivateDAO and Agents.PrivateDAO.org"))
    story.append(P(
        "PrivateDAO is a privacy-oriented coordination and verification product. Its public agent exchange "
        "turns capabilities into structured, discoverable services rather than opaque agent-to-agent promises. "
        "The exchange can validate inputs, execute read-only or gated actions, attach provenance, and return a "
        "machine-readable receipt.",
    ))
    story.append(P("How an agent uses the exchange", "H2P"))
    for text in [
        "<b>Discover:</b> read the Agent Card, service catalog, A2A surface, or MCP tools.",
        "<b>Request:</b> submit a structured service job with an explicit service identifier and input.",
        "<b>Execute:</b> run within a bounded provider boundary; paid work remains quote-first and fail-closed.",
        "<b>Evidence:</b> attach hashes, provider provenance, and completion metadata to the result.",
        "<b>Verify:</b> retrieve a receipt and use the public verification route to confirm the result.",
    ]:
        story.append(bullet(text))
    story.append(P("Design principles", "H2P"))
    principle_data = [
        [P("PRINCIPLE", "TableHead"), P("IMPLEMENTATION", "TableHead")],
        [P("Privacy by boundary", "TableCell"), P("Secrets remain server-side; public APIs expose sanitized provider status and receipts, not credentials.", "TableCell")],
        [P("Verifiability", "TableCell"), P("Results carry deterministic hashes, provenance, timestamps, and a public receipt-verification route.", "TableCell")],
        [P("Explicit execution", "TableCell"), P("Read-only capabilities are separated from job creation and payment-related actions; no automatic wallet custody.", "TableCell")],
        [P("Provider honesty", "TableCell"), P("The system reports provider identity and evidence persistence status instead of implying unsupported guarantees.", "TableCell")],
    ]
    t = Table(principle_data, colWidths=[42 * mm, 134 * mm], repeatRows=1)
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), NAVY), ("GRID", (0, 0), (-1, -1), 0.4, LINE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 7),
        ("RIGHTPADDING", (0, 0), (-1, -1), 7), ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6), ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, PALE]),
    ]))
    story.append(t)

    # 3
    story.append(PageBreak())
    story.extend(section_title("03", "Production architecture"))
    story.append(P(
        "The production service runs in AWS eu-north-1 with private network controls. MongoDB Atlas is reached "
        "through an approved service egress boundary, keeping evidence storage separate from public clients and "
        "from payment or custody responsibilities.",
    ))
    arch_rows = [
        [P("AGENT / CLIENT", "TableHead"), P("PRIVATE DAO EDGE", "TableHead"), P("DATA & PROVIDERS", "TableHead")],
        [P("MCP • A2A • REST<br/>Agent Card discovery", "TableCell"), P("API Gateway<br/>Node.js 22 Lambda<br/>rate limits + gates", "TableCell"), P("DynamoDB<br/>jobs, receipts, payments", "TableCell")],
        [P("Structured service request<br/>receipt retrieval", "TableCell"), P("Private subnets<br/>security group: egress only<br/>Secrets Manager", "TableCell"), P("MongoDB Atlas<br/>evidence history/search<br/>idempotent job index", "TableCell")],
        [P("Human or autonomous agent", "TableCell"), P("Controlled egress<br/>approved Atlas access boundary", "TableCell"), P("GitHub App • Solana<br/>read-only external evidence", "TableCell")],
    ]
    arch = Table(arch_rows, colWidths=[57 * mm, 57 * mm, 62 * mm], repeatRows=1)
    arch.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), NAVY), ("GRID", (0, 0), (-1, -1), 0.5, LINE),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"), ("LEFTPADDING", (0, 0), (-1, -1), 7),
        ("RIGHTPADDING", (0, 0), (-1, -1), 7), ("TOPPADDING", (0, 0), (-1, -1), 9),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 9), ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, PALE]),
    ]))
    story.append(arch)
    story.append(Spacer(1, 7 * mm))
    story.append(P("MongoDB evidence document", "H2P"))
    story.append(P(
        "Each completed job is upserted by <b>job_id</b>. The current document shape includes: "
        "<b>job_id</b>, <b>service</b>, <b>input_hash</b>, <b>completed_at</b>, <b>result</b>, "
        "<b>provider</b>, and <b>updated_at</b>. The runtime creates a unique job index and a service/time "
        "index for history queries. This makes retries safe and keeps the evidence layer useful across "
        "heterogeneous service results.",
    ))
    story.append(P("Boundary of responsibility", "H2P"))
    story.append(P(
        "MongoDB does not hold wallet keys, seed phrases, GitHub App private keys, or client credentials. "
        "DynamoDB remains the canonical operational store for job, quote, receipt, and payment records; "
        "MongoDB provides the searchable evidence-history projection.",
    ))

    # 4
    story.append(PageBreak())
    story.extend(section_title("04", "Production verification"))
    story.append(P(
        "The following evidence was captured from the live production surface on 24 September 2026. "
        "The validation used a free verification workflow, so a partner or customer payment was not required "
        "to confirm the production integration.",
    ))
    verify_data = [
        [P("CHECK", "TableHead"), P("RESULT", "TableHead"), P("EVIDENCE", "TableHead")],
        [P("Public health", "TableCell"), P("PASS", "TableCellGreen"), P("status=ok; network=solana-mainnet-beta", "TableCell")],
        [P("Provider status", "TableCell"), P("PASS", "TableCellGreen"), P("MongoDB configured; role=evidence-history-and-search; credentials_exposed=false", "TableCell")],
        [P("Production job", "TableCell"), P("PASS", "TableCellGreen"), P("job_15950ed5-3c68-4db3-8c99-c41ce7ffa654", "TableCell")],
        [P("MongoDB write", "TableCell"), P("PASS", "TableCellGreen"), P("result.evidence_persistence=persisted", "TableCell")],
        [P("MongoDB direct read", "TableCell"), P("PASS", "TableCellGreen"), P("found=true; provider=mongodb; service=verify.basic", "TableCell")],
        [P("Receipt", "TableCell"), P("PASS", "TableCellGreen"), P("rvr_4c40eed6ea561454cbdd8dcaaabc7a72; status=VERIFIED", "TableCell")],
        [P("Receipt verification", "TableCell"), P("PASS", "TableCellGreen"), P("HTTP 200 at /verify/receipt/{receipt_id}", "TableCell")],
    ]
    verify = Table(verify_data, colWidths=[37 * mm, 25 * mm, 114 * mm], repeatRows=1)
    verify.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), NAVY), ("GRID", (0, 0), (-1, -1), 0.4, LINE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6), ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6), ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, PALE]),
    ]))
    story.append(verify)
    story.append(Spacer(1, 7 * mm))
    story.append(P("Operational posture", "H2P"))
    for text in [
        "MongoDB credentials are read from AWS Secrets Manager and never returned by public provider status.",
        "Atlas access is restricted to the approved production egress boundary; temporary local verification access was removed after testing.",
        "MongoDB connection failure is surfaced as evidence_persistence=unavailable rather than hidden or treated as success.",
        "The integration is read/write for evidence persistence only; no payment or wallet custody is delegated to MongoDB.",
    ]:
        story.append(bullet(text))

    # 5
    story.append(PageBreak())
    story.extend(section_title("05", "Business case and partner relationship"))
    story.append(P(
        "Organizations are adopting autonomous software to research, coordinate and act, but they still need "
        "a dependable record of what happened. PrivateDAO turns agent activity into evidence that teams can "
        "review, search and verify without exposing sensitive operational details.",
    ))
    story.append(P("The customer value", "H2P"))
    for text in [
        "Teams receive a clear, searchable history of agent work instead of fragmented logs and unverifiable claims.",
        "Sensitive workflows can remain private while outcomes remain accountable to operators, reviewers and partners.",
        "Agents can use one discoverable exchange for verification, intelligence and workflow services with consistent receipts.",
        "The model supports a practical path from pilot projects to repeatable enterprise operations.",
    ]:
        story.append(bullet(text))
    story.append(P("Why MongoDB is relevant", "H2P"))
    story.append(P(
        "MongoDB Atlas gives this customer story a flexible evidence-history layer for varied agent outputs, "
        "searchable operational history and future tenant-aware analytics. PrivateDAO participates in the "
        "MongoDB Partner Program and MongoDB for Startups, with program benefits and commercial terms governed "
        "by the applicable MongoDB agreements.",
    ))
    story.append(Spacer(1, 4 * mm))
    story.append(Table([
        [P("LIVE PRODUCT", "SmallP"), P("https://agents.privatedao.org", "CalloutP")],
        [P("MCP ENTRYPOINT", "SmallP"), P("https://agents.privatedao.org/mcp", "CalloutP")],
        [P("PROVIDER STATUS", "SmallP"), P("https://agents.privatedao.org/api/providers/status", "CalloutP")],
        [P("RECEIPT", "SmallP"), P("https://agents.privatedao.org/receipts/rvr_4c40eed6ea561454cbdd8dcaaabc7a72", "CalloutP")],
        [P("VERIFICATION", "SmallP"), P("https://agents.privatedao.org/verify/receipt/rvr_4c40eed6ea561454cbdd8dcaaabc7a72", "CalloutP")],
        [P("CONTACT", "SmallP"), P("PrivateDAO Partnerships<br/>partners@privatedao.org<br/>Warsaw, Poland", "CalloutP")],
    ], colWidths=[42 * mm, 134 * mm], style=TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), PALE), ("BOX", (0, 0), (-1, -1), 0.6, LINE),
        ("LINEBELOW", (0, 0), (-1, -2), 0.4, LINE), ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 8), ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 7), ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
    ])))
    story.append(Spacer(1, 10 * mm))
    story.append(P("References", "H2P"))
    for text in [
        "MongoDB Partner Program Agreement: https://www.mongodb.com/company/partners/partner-program-agreement",
        "MongoDB Partner Program Onboarding Guide: https://www.mongodb.com/partners/partner-program/partner-onboarding-guide",
        "MongoDB Partner Development Support: https://www.mongodb.com/company/partners/support",
    ]:
        story.append(P(text, "SmallP"))
    story.append(Spacer(1, 5 * mm))
    story.append(P(
        "Disclosure: PrivateDAO is represented in this brief as a MongoDB Partner Program and MongoDB for "
        "Startups participant. This does not claim a MongoDB certification, customer reference, endorsement, "
        "or joint commercial offering beyond the applicable program terms.", "SmallP",
    ))

    doc.build(story, onFirstPage=page_chrome, onLaterPages=page_chrome)
    print(OUT)


if __name__ == "__main__":
    build()
