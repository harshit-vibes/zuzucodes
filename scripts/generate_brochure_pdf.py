#!/usr/bin/env python3
"""
Generate a PDF brochure for zuzu.codes using the website design system.
Design: Light mode with cream backgrounds, dark goldenrod accent (#B8860B)
"""

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch, mm
from reportlab.lib.colors import HexColor
from reportlab.pdfgen import canvas
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import Paragraph
import os

# Design System Colors
COLORS = {
    'bg_primary': HexColor('#FEFDFB'),
    'bg_surface': HexColor('#F5F3EF'),
    'bg_card': HexColor('#FFFFFF'),
    'text_primary': HexColor('#1A1A1A'),
    'text_secondary': HexColor('#4B5563'),
    'text_muted': HexColor('#9CA3AF'),
    'accent': HexColor('#B8860B'),
    'accent_soft': HexColor('#F5EFE0'),
    'border': HexColor('#E5E7EB'),
}

# Page dimensions
PAGE_WIDTH, PAGE_HEIGHT = A4
MARGIN = 45
CONTENT_WIDTH = PAGE_WIDTH - (MARGIN * 2)


def draw_page_background(c, color):
    """Fill page with background color."""
    c.setFillColor(color)
    c.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, fill=True, stroke=False)


def draw_tag(c, text, x, y, centered=False):
    """Draw a styled tag element."""
    text_upper = text.upper()
    text_width = c.stringWidth(text_upper, 'Helvetica-Bold', 9)
    padding_x = 12

    if centered:
        x = x - (text_width + padding_x * 2) / 2

    # Background
    c.setFillColor(COLORS['accent_soft'])
    c.roundRect(x, y - 6, text_width + padding_x * 2, 20, 10, fill=True, stroke=False)

    # Text
    c.setFillColor(COLORS['accent'])
    c.setFont('Helvetica-Bold', 9)
    c.drawString(x + padding_x, y + 2, text_upper)

    return text_width + padding_x * 2


def draw_wrapped_text(c, text, x, y, max_width, font='Helvetica', size=11, color=None, centered=False):
    """Draw text with word wrap, returns final y position."""
    if color is None:
        color = COLORS['text_secondary']

    c.setFillColor(color)
    c.setFont(font, size)

    words = text.split()
    lines = []
    line = ""

    for word in words:
        test_line = (line + " " + word).strip()
        if c.stringWidth(test_line, font, size) <= max_width:
            line = test_line
        else:
            if line:
                lines.append(line)
            line = word
    if line:
        lines.append(line)

    line_height = size * 1.4
    for line_text in lines:
        if centered:
            c.drawCentredString(x, y, line_text)
        else:
            c.drawString(x, y, line_text)
        y -= line_height

    return y


def draw_divider(c, x, y, width):
    """Draw a horizontal divider line."""
    c.setStrokeColor(COLORS['border'])
    c.setLineWidth(0.5)
    c.line(x, y, x + width, y)


def draw_logo(c, x, y, size=18, centered=False):
    """Draw the zuzu.codes logo."""
    c.setFont('Helvetica', size)
    zuzu_w = c.stringWidth("zuzu", 'Helvetica', size)
    dot_w = c.stringWidth(".", 'Helvetica', size)
    codes_w = c.stringWidth("codes", 'Helvetica', size)
    total_w = zuzu_w + dot_w + codes_w

    if centered:
        x = x - total_w / 2

    c.setFillColor(COLORS['text_primary'])
    c.drawString(x, y, "zuzu")
    c.setFillColor(COLORS['accent'])
    c.drawString(x + zuzu_w, y, ".")
    c.setFillColor(COLORS['text_primary'])
    c.drawString(x + zuzu_w + dot_w, y, "codes")


# =============================================
# PAGE 1: Cover / The Shift
# =============================================
def draw_page_1(c):
    draw_page_background(c, COLORS['bg_primary'])

    y = PAGE_HEIGHT - 100
    draw_tag(c, "The New Professional Baseline", MARGIN, y)

    # Headline
    y -= 55
    c.setFillColor(COLORS['text_primary'])
    c.setFont('Times-Roman', 40)
    c.drawString(MARGIN, y, "AI-native upskilling")
    y -= 48
    c.drawString(MARGIN, y, "for the modern")
    y -= 48
    c.drawString(MARGIN, y, "professional")

    # Body paragraphs
    y -= 50

    paras = [
        ("AI-native tools are no longer optional. They're the new professional baseline.", COLORS['text_secondary']),
        ("But there's a gap. MBAs teach strategy. Bootcamps teach tools. Neither teaches AI-native operations thinking — the instinct to identify, design, and manage automated processes.", COLORS['text_secondary']),
        ("Surface-level tool familiarity isn't enough. The professionals who master AI-native automation management become force multipliers — personally and organizationally.", COLORS['text_secondary']),
    ]

    for text, color in paras:
        y = draw_wrapped_text(c, text, MARGIN, y, CONTENT_WIDTH, 'Helvetica', 12, color)
        y -= 12

    # Logo at bottom
    draw_logo(c, MARGIN, 50, 18)

    c.showPage()


# =============================================
# PAGE 2: The Zuzu Method
# =============================================
def draw_page_2(c):
    draw_page_background(c, COLORS['bg_surface'])

    y = PAGE_HEIGHT - 90
    draw_tag(c, "The Zuzu Method", MARGIN, y)

    # Headline
    y -= 45
    c.setFillColor(COLORS['text_primary'])
    c.setFont('Times-Roman', 30)
    c.drawString(MARGIN, y, "We don't teach tools. We build instincts.")

    # Subheading
    y -= 35
    y = draw_wrapped_text(c,
        "Every topic traverses four quadrants — a complete learning cycle that produces deep, transferable competence.",
        MARGIN, y, CONTENT_WIDTH, 'Helvetica', 11, COLORS['text_secondary'])

    # 2x2 Grid
    y -= 30
    grid_gap = 12
    grid_width = (CONTENT_WIDTH - grid_gap) / 2
    grid_height = 90

    quadrants = [
        ("01", "Core Theory", "Principles and mental models that transfer"),
        ("02", "Pattern Recognition", "Real-world cases with expert analysis"),
        ("03", "Independent Application", "Build it yourself, make mistakes, learn"),
        ("04", "Expert Guidance", "Feedback and refinement from practitioners"),
    ]

    grid_top = y
    for i, (num, title, desc) in enumerate(quadrants):
        row = i // 2
        col = i % 2
        cell_x = MARGIN + col * (grid_width + grid_gap)
        cell_y = grid_top - row * (grid_height + grid_gap)

        # Cell background
        c.setFillColor(COLORS['bg_card'])
        c.setStrokeColor(COLORS['border'])
        c.setLineWidth(1)
        c.roundRect(cell_x, cell_y - grid_height, grid_width, grid_height, 8, fill=True, stroke=True)

        # Number
        c.setFillColor(COLORS['accent'])
        c.setFont('Courier', 10)
        c.drawString(cell_x + 12, cell_y - 20, num)

        # Title
        c.setFillColor(COLORS['text_primary'])
        c.setFont('Helvetica-Bold', 13)
        c.drawString(cell_x + 12, cell_y - 38, title)

        # Description
        draw_wrapped_text(c, desc, cell_x + 12, cell_y - 55, grid_width - 24, 'Helvetica', 10, COLORS['text_secondary'])

    # Why it works
    y = grid_top - 2 * (grid_height + grid_gap) - 35

    c.setFillColor(COLORS['text_primary'])
    c.setFont('Helvetica-Bold', 13)
    c.drawString(MARGIN, y, "Why this works")

    y -= 25
    why_points = [
        "Theory without application fades.",
        "Application without theory is imitation.",
        "Independence without guidance plateaus.",
        "Guidance without independence creates dependency.",
    ]

    for point in why_points:
        c.setFillColor(COLORS['accent'])
        c.circle(MARGIN + 4, y + 3, 3, fill=True, stroke=False)
        c.setFillColor(COLORS['text_secondary'])
        c.setFont('Helvetica', 10)
        c.drawString(MARGIN + 14, y, point)
        y -= 18

    # Tagline
    y -= 15
    c.setFillColor(COLORS['text_primary'])
    c.setFont('Helvetica-Bold', 12)
    c.drawString(MARGIN, y, "Complete the quadrant. Build lasting competence.")

    c.showPage()


# =============================================
# PAGE 3: Who This Is For
# =============================================
def draw_page_3(c):
    draw_page_background(c, COLORS['bg_primary'])

    y = PAGE_HEIGHT - 90
    draw_tag(c, "Who This Is For", MARGIN, y)

    # Headline
    y -= 45
    c.setFillColor(COLORS['text_primary'])
    c.setFont('Times-Roman', 30)
    c.drawString(MARGIN, y, "Built for professionals who want more.")

    y -= 55

    audiences = [
        ("01", "Career-focused professionals", "seeking AI-native skills that compound over time."),
        ("02", "Founders and operators", "who treat productivity as competitive advantage."),
        ("03", "Team leads", "building automation-first cultures."),
        ("04", "Consultants", "adding process optimization to their practice."),
    ]

    for i, (num, title, desc) in enumerate(audiences):
        # Number
        c.setFillColor(COLORS['accent'])
        c.setFont('Courier', 14)
        c.drawString(MARGIN, y, num)

        # Title
        c.setFillColor(COLORS['text_primary'])
        c.setFont('Helvetica-Bold', 12)
        c.drawString(MARGIN + 35, y, title)

        # Description
        c.setFillColor(COLORS['text_secondary'])
        c.setFont('Helvetica', 12)
        title_w = c.stringWidth(title + " ", 'Helvetica-Bold', 12)
        c.drawString(MARGIN + 35 + title_w, y, desc)

        y -= 25
        if i < len(audiences) - 1:
            draw_divider(c, MARGIN + 35, y + 5, CONTENT_WIDTH - 35)
        y -= 25

    # MBA parallel
    y -= 20
    draw_divider(c, MARGIN, y + 15, CONTENT_WIDTH)

    y -= 15
    c.setFillColor(COLORS['text_secondary'])
    c.setFont('Times-Italic', 13)
    c.drawCentredString(PAGE_WIDTH / 2, y, "Like an MBA provides frameworks for business thinking,")
    y -= 20
    c.drawCentredString(PAGE_WIDTH / 2, y, "this curriculum provides frameworks for")
    y -= 20
    c.setFillColor(COLORS['accent'])
    c.drawCentredString(PAGE_WIDTH / 2, y, "AI-native operations thinking.")

    c.showPage()


# =============================================
# PAGE 4: The Courses
# =============================================
def draw_page_4(c):
    draw_page_background(c, COLORS['bg_surface'])

    y = PAGE_HEIGHT - 70
    draw_tag(c, "The Courses", MARGIN, y)

    # Course 1
    y -= 40
    c.setFillColor(COLORS['text_primary'])
    c.setFont('Times-Roman', 22)
    c.drawString(MARGIN, y, "Course 1: Personal Productivity")

    y -= 22
    c.setFillColor(COLORS['text_secondary'])
    c.setFont('Times-Italic', 10)
    c.drawString(MARGIN, y, "From manual processes → to systematized personal operations that run themselves.")

    y -= 28

    modules_1 = [
        ("Module 1: First Principles", "How automation thinks",
         ["Introduction to Workflow Thinking", "Your First Automation", "Connecting Services", "Working with Data"]),
        ("Module 2: Building Blocks", "The patterns behind every workflow",
         ["Triggers and Schedules", "When Things Go Wrong", "Complex Data Structures", "Processing Different Formats"]),
        ("Module 3: Production Ready", "From working to reliable",
         ["Building Resilient Workflows", "Multi-Step Architectures", "Monitoring What You Build", "Going to Production"]),
    ]

    for title, subtitle, lessons in modules_1:
        c.setFillColor(COLORS['text_primary'])
        c.setFont('Helvetica-Bold', 11)
        c.drawString(MARGIN, y, title)
        c.setFillColor(COLORS['text_muted'])
        c.setFont('Helvetica', 9)
        c.drawString(MARGIN + c.stringWidth(title + "  ", 'Helvetica-Bold', 11), y, f"— {subtitle}")
        y -= 15
        for lesson in lessons:
            c.setFillColor(COLORS['text_secondary'])
            c.setFont('Helvetica', 9)
            c.drawString(MARGIN + 12, y, f"• {lesson}")
            y -= 12
        y -= 8

    # Divider
    y -= 5
    draw_divider(c, MARGIN, y, CONTENT_WIDTH)
    y -= 20

    # Course 2
    c.setFillColor(COLORS['text_primary'])
    c.setFont('Times-Roman', 22)
    c.drawString(MARGIN, y, "Course 2: Business Operations")

    y -= 22
    c.setFillColor(COLORS['text_secondary'])
    c.setFont('Times-Italic', 10)
    c.drawString(MARGIN, y, "From individual competence → to organizational capability across teams and systems.")

    y -= 28

    modules_2 = [
        ("Module 1: Process Design", "From business need to automation blueprint",
         ["Mapping Processes", "Finding Automation Opportunities", "Building the Business Case", "Designing for Scale"]),
        ("Module 2: Enterprise Integrations", "Connecting the systems that run your business",
         ["CRM Workflows", "Finance and Operations", "Working with Databases", "Communication Flows"]),
        ("Module 3: Production & Compliance", "Automations that organizations can trust",
         ["Security and Access", "Audit and Recovery", "Performance at Scale", "Maintenance and Evolution"]),
    ]

    for title, subtitle, lessons in modules_2:
        c.setFillColor(COLORS['text_primary'])
        c.setFont('Helvetica-Bold', 11)
        c.drawString(MARGIN, y, title)
        c.setFillColor(COLORS['text_muted'])
        c.setFont('Helvetica', 9)
        c.drawString(MARGIN + c.stringWidth(title + "  ", 'Helvetica-Bold', 11), y, f"— {subtitle}")
        y -= 15
        for lesson in lessons:
            c.setFillColor(COLORS['text_secondary'])
            c.setFont('Helvetica', 9)
            c.drawString(MARGIN + 12, y, f"• {lesson}")
            y -= 12
        y -= 8

    c.showPage()


# =============================================
# PAGE 5: Pricing
# =============================================
def draw_page_5(c):
    draw_page_background(c, COLORS['bg_primary'])

    y = PAGE_HEIGHT - 80
    draw_tag(c, "Pricing", MARGIN, y)

    # Headline
    y -= 40
    c.setFillColor(COLORS['text_primary'])
    c.setFont('Times-Roman', 28)
    c.drawString(MARGIN, y, "Choose your depth")

    y -= 25
    c.setFillColor(COLORS['text_secondary'])
    c.setFont('Helvetica', 11)
    c.drawString(MARGIN, y, "Cohort-based learning with fixed timelines, peer accountability, and structured progression.")

    y -= 18
    c.setFillColor(COLORS['text_muted'])
    c.setFont('Helvetica', 9)
    c.drawString(MARGIN, y, "Higher tiers = deeper engagement at each stage")

    # Pricing cards - clean layout
    y -= 40

    card_gap = 12
    card_width = (CONTENT_WIDTH - card_gap * 2) / 3
    card_height = 340
    card_top = y

    tiers = [
        {
            "name": "Essential",
            "desc": "Self-paced learning with community support",
            "price": None,
            "featured": False,
            "features": [
                ("Theory", "Self-paced"),
                ("Patterns", "Library"),
                ("Application", "Self-directed"),
                ("Guidance", "Community"),
            ],
            "cta": "Contact Us"
        },
        {
            "name": "Pro",
            "desc": "Enhanced learning with live instruction",
            "price": "₹3,000",
            "featured": True,
            "features": [
                ("Theory", "Enhanced"),
                ("Patterns", "+ Live"),
                ("Application", "+ Structured"),
                ("Guidance", "+ Instructor"),
            ],
            "cta": "Contact Us"
        },
        {
            "name": "Premium",
            "desc": "Deep, personalized learning experience",
            "price": None,
            "featured": False,
            "features": [
                ("Theory", "Deep dive"),
                ("Patterns", "+ Expert"),
                ("Application", "+ Personal"),
                ("Guidance", "+ 1:1"),
            ],
            "cta": "Contact Us"
        },
    ]

    for i, tier in enumerate(tiers):
        card_x = MARGIN + i * (card_width + card_gap)

        # Featured card is slightly taller
        if tier["featured"]:
            actual_height = card_height + 20
            actual_y = card_top + 10
        else:
            actual_height = card_height
            actual_y = card_top

        # Card background
        c.setFillColor(COLORS['bg_card'])
        if tier["featured"]:
            c.setStrokeColor(COLORS['accent'])
            c.setLineWidth(2)
        else:
            c.setStrokeColor(COLORS['border'])
            c.setLineWidth(1)
        c.roundRect(card_x, actual_y - actual_height, card_width, actual_height, 10, fill=True, stroke=True)

        # Card content
        padding = 15
        text_x = card_x + padding
        text_y = actual_y - 25

        # Featured badge
        if tier["featured"]:
            badge_w = 80
            c.setFillColor(COLORS['accent_soft'])
            c.roundRect(text_x, text_y - 2, badge_w, 16, 8, fill=True, stroke=False)
            c.setFillColor(COLORS['accent'])
            c.setFont('Helvetica-Bold', 7)
            c.drawString(text_x + 8, text_y + 2, "MOST POPULAR")
            text_y -= 28
        else:
            text_y -= 5

        # Tier name
        c.setFillColor(COLORS['text_primary'])
        c.setFont('Times-Roman', 24)
        c.drawString(text_x, text_y, tier["name"])

        # Price (if available)
        if tier["price"]:
            text_y -= 22
            c.setFillColor(COLORS['accent'])
            c.setFont('Helvetica-Bold', 18)
            c.drawString(text_x, text_y, tier["price"])
            text_y -= 18
        else:
            text_y -= 22

        # Description
        c.setFillColor(COLORS['text_secondary'])
        c.setFont('Helvetica', 9)
        desc_lines = []
        words = tier["desc"].split()
        line = ""
        for word in words:
            test = (line + " " + word).strip()
            if c.stringWidth(test, 'Helvetica', 9) < card_width - padding * 2:
                line = test
            else:
                desc_lines.append(line)
                line = word
        if line:
            desc_lines.append(line)
        for dl in desc_lines:
            c.drawString(text_x, text_y, dl)
            text_y -= 13

        # Features - stacked vertically for clarity
        text_y -= 18
        for quadrant, value in tier["features"]:
            # Label on top (muted)
            c.setFillColor(COLORS['text_muted'])
            c.setFont('Helvetica', 8)
            c.drawString(text_x, text_y, quadrant)

            # Value below (bold)
            text_y -= 12
            c.setFillColor(COLORS['text_primary'])
            c.setFont('Helvetica-Bold', 9)
            c.drawString(text_x, text_y, value)

            text_y -= 18

        # CTA Button
        text_y -= 8
        btn_width = card_width - padding * 2
        btn_height = 30

        if tier["featured"]:
            c.setFillColor(COLORS['accent'])
            c.roundRect(text_x, text_y - btn_height + 10, btn_width, btn_height, 6, fill=True, stroke=False)
            c.setFillColor(COLORS['bg_primary'])
        else:
            c.setFillColor(COLORS['bg_card'])
            c.setStrokeColor(COLORS['border'])
            c.setLineWidth(1)
            c.roundRect(text_x, text_y - btn_height + 10, btn_width, btn_height, 6, fill=True, stroke=True)
            c.setFillColor(COLORS['text_primary'])

        c.setFont('Helvetica-Bold', 10)
        c.drawCentredString(text_x + btn_width / 2, text_y - 4, tier["cta"])

    # Bottom note
    y = card_top - card_height - 45
    c.setFillColor(COLORS['text_muted'])
    c.setFont('Helvetica', 10)
    c.drawCentredString(PAGE_WIDTH / 2, y, "Bundle and early bird options available.")

    c.showPage()


# =============================================
# PAGE 6: About / Back Cover
# =============================================
def draw_page_6(c):
    draw_page_background(c, COLORS['bg_surface'])

    y = PAGE_HEIGHT - 110
    draw_tag(c, "About", PAGE_WIDTH / 2, y, centered=True)

    # About content
    y -= 50

    about_paras = [
        ('The gap between "knowing about AI tools" and "being AI-native" is growing.', COLORS['text_secondary']),
        ("Tutorials teach features. Bootcamps teach syntax. Neither builds operational instincts.", COLORS['text_secondary']),
        ("Kuma Learn built zuzu.codes to close that gap — with MBA-level rigor applied to AI-native upskilling.", COLORS['text_primary']),
    ]

    for text, color in about_paras:
        c.setFillColor(color)
        c.setFont('Helvetica', 12)
        words = text.split()
        lines = []
        line = ""
        max_w = CONTENT_WIDTH - 80
        for word in words:
            test = (line + " " + word).strip()
            if c.stringWidth(test, 'Helvetica', 12) < max_w:
                line = test
            else:
                lines.append(line)
                line = word
        if line:
            lines.append(line)
        for ln in lines:
            c.drawCentredString(PAGE_WIDTH / 2, y, ln)
            y -= 18
        y -= 12

    # Promise box
    y -= 25
    box_width = CONTENT_WIDTH - 60
    box_x = MARGIN + 30
    box_height = 85

    c.setFillColor(COLORS['bg_card'])
    c.setStrokeColor(COLORS['border'])
    c.setLineWidth(1)
    c.roundRect(box_x, y - box_height, box_width, box_height, 10, fill=True, stroke=True)

    c.setFillColor(COLORS['text_primary'])
    c.setFont('Times-Italic', 13)
    c.drawCentredString(PAGE_WIDTH / 2, y - 25, '"Complete the quadrant with genuine effort,')
    c.drawCentredString(PAGE_WIDTH / 2, y - 43, "and you'll emerge AI-native — with instincts that")
    c.setFillColor(COLORS['accent'])
    c.drawCentredString(PAGE_WIDTH / 2, y - 61, 'compound across your entire career."')

    # Contact
    y = y - box_height - 35
    c.setFillColor(COLORS['text_primary'])
    c.setFont('Helvetica-Bold', 11)
    c.drawCentredString(PAGE_WIDTH / 2, y, "Contact Us")

    y -= 20
    c.setFillColor(COLORS['accent'])
    c.setFont('Helvetica', 12)
    c.drawCentredString(PAGE_WIDTH / 2, y, "WhatsApp: +91 80118 58376")

    y -= 18
    c.setFillColor(COLORS['text_secondary'])
    c.setFont('Helvetica', 11)
    c.drawCentredString(PAGE_WIDTH / 2, y, "hello@zuzu.codes")

    # Logo
    y -= 35
    draw_logo(c, PAGE_WIDTH / 2, y, 22, centered=True)

    # Business entity
    y -= 25
    c.setFillColor(COLORS['text_secondary'])
    c.setFont('Helvetica', 9)
    c.drawCentredString(PAGE_WIDTH / 2, y, "Operated by Kuma Learn")

    # Copyright
    y -= 18
    c.setFillColor(COLORS['text_muted'])
    c.setFont('Helvetica', 9)
    c.drawCentredString(PAGE_WIDTH / 2, y, "© 2025 Kuma Learn. All rights reserved.")

    c.showPage()


def create_brochure(output_path):
    """Create the zuzu.codes brochure PDF."""
    c = canvas.Canvas(output_path, pagesize=A4)

    draw_page_1(c)
    draw_page_2(c)
    draw_page_3(c)
    draw_page_4(c)
    draw_page_5(c)
    draw_page_6(c)

    c.save()
    print(f"PDF created: {output_path}")


if __name__ == "__main__":
    output_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    output_path = os.path.join(output_dir, "brochure.pdf")
    create_brochure(output_path)
