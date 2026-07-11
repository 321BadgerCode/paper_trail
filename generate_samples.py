import os
from PIL import Image, ImageDraw, ImageFont

def create_receipt(filename, title, date, items, total, notes=None):
    # Create image with light cream receipt background
    width, height = 400, 500
    image = Image.new("RGB", (width, height), "#f9f9fb")
    draw = ImageDraw.Draw(image)
    
    # Draw receipt border/outline
    draw.rectangle([(10, 10), (width - 10, height - 10)], outline="#d1d5db", width=2)
    
    # Draw decorative header line
    draw.line([(20, 20), (width - 20, 20)], fill="#6366f1", width=4)
    
    # Load default font
    try:
        font = ImageFont.load_default()
    except Exception:
        font = None
        
    # Simple draw text helper
    def draw_text(text, x, y, color="#1e293b", size_multiplier=1):
        draw.text((x, y), text, fill=color)

    y_offset = 35
    
    # Header Title
    draw_text(title.upper(), 40, y_offset)
    y_offset += 25
    draw_text("BUSINESS RECEIPT", 40, y_offset, color="#64748b")
    y_offset += 30
    
    # Metadata
    draw_text(f"DATE: {date}", 40, y_offset)
    draw_text("TXN ID: #8849-209", 220, y_offset)
    y_offset += 20
    draw_text("PAYMENT: Corp Card ending in 4920", 40, y_offset, color="#475569")
    y_offset += 25
    
    # Divider
    draw.line([(30, y_offset), (width - 30, y_offset)], fill="#e5e7eb", width=1)
    y_offset += 20
    
    # Items Header
    draw_text("ITEM DESCRIPTION", 40, y_offset, color="#64748b")
    draw_text("PRICE", 300, y_offset, color="#64748b")
    y_offset += 20
    
    # List Items
    for item, qty, price in items:
        draw_text(f"{item} (x{qty})", 40, y_offset)
        draw_text(f"${price:.2f}", 300, y_offset)
        y_offset += 25
        
    # Divider
    y_offset += 10
    draw.line([(30, y_offset), (width - 30, y_offset)], fill="#e5e7eb", width=1)
    y_offset += 20
    
    # Total
    draw_text("TOTAL AMOUNT", 40, y_offset, color="#1e293b")
    draw_text(f"${total:.2f}", 300, y_offset, color="#111827")
    
    # Notes/Footer
    if notes:
        y_offset += 40
        draw.rectangle([(30, y_offset), (width - 30, y_offset + 60)], fill="#f1f5f9", outline="#e2e8f0")
        notes_lines = notes.split('\n')
        for i, line in enumerate(notes_lines):
            draw_text(line, 40, y_offset + 10 + (i * 18), color="#475569")
            
    y_offset = 450
    draw_text("THANK YOU FOR YOUR BUSINESS!", 100, y_offset, color="#94a3b8")
    
    # Save the file
    os.makedirs(os.path.dirname(filename), exist_ok=True)
    image.save(filename)
    print(f"Receipt saved to {filename}")

# Generate sample 1: Compliant (Office Supplies)
items_compliant = [
    ("Acme Copy Paper Reams", 5, 25.00),
    ("Gel Ink Pens (Black)", 2, 8.50),
    ("Desk Organizer Tray", 1, 14.99)
]
create_receipt(
    "public/samples/compliant_receipt.png",
    "Acme Office Supplies",
    "2026-07-10",
    items_compliant,
    48.49,
    notes="Category: Office Supplies\nAuditor Check: Compliant"
)

# Generate sample 2: Non-Compliant (Violates dinner limit & contains alcohol)
items_non_compliant = [
    ("Ribeye Steak Dinner", 1, 45.00),
    ("Premium Napa Cabernet", 1, 24.00),
    ("Old Fashioned Cocktail", 1, 14.00),
    ("Warm Chocolate Lava Cake", 1, 8.50)
]
create_receipt(
    "public/samples/non_compliant_receipt.png",
    "The Grillhouse Bistro",
    "2026-07-11",
    items_non_compliant,
    91.50,
    notes="Table 14 - Waiter: Marco\nIncludes alcohol items"
)
