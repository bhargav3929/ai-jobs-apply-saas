from pypdf import PdfWriter
from io import BytesIO

def create_dummy_pdf():
    writer = PdfWriter()
    writer.add_blank_page(width=72, height=72)
    
    # We can't easily add text with just pypdf without creating a complex object stream
    # So for this test, we accept that pypdf will read an empty page 
    # or we can try to write a simple text string if we had reportlab.
    # But since I don't want to install reportlab just for a test, 
    # I'll rely on the server handling an empty/simple PDF gracefully.
    
    with open("dummy_resume.pdf", "wb") as f:
        writer.write(f)

if __name__ == "__main__":
    create_dummy_pdf()
