"""
Certificate Service for generating blood donation certificates

Generates professional PDF certificates for completed donations using ReportLab
"""

import os
from datetime import datetime
from io import BytesIO
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas
from reportlab.platypus import Table, TableStyle, Paragraph, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont


class CertificateService:
    """Service for generating donation certificates"""
    
    def __init__(self, certificates_dir="certificates"):
        """
        Initialize certificate service
        
        Args:
            certificates_dir: Directory to store generated certificates
        """
        self.certificates_dir = certificates_dir
        self.ensure_certificates_dir()
    
    def ensure_certificates_dir(self):
        """Ensure certificates directory exists"""
        if not os.path.exists(self.certificates_dir):
            os.makedirs(self.certificates_dir, exist_ok=True)
    
    def generate_certificate_number(self, donation_id, hospital_id, donor_id):
        """
        Generate unique certificate number
        
        Format: CERT-YYYY-HH-DDDD-DONID
        Example: CERT-2025-003-0001-00042
        """
        year = datetime.now().year
        cert_num = f"CERT-{year}-{hospital_id:03d}-{donor_id:04d}-{donation_id:05d}"
        return cert_num
    
    def generate_certificate_pdf(self, donation_data):
        """
        Generate a professional PDF certificate
        
        Args:
            donation_data: Dictionary with donation details:
                - donor_name: Full name of donor
                - donor_id: Donor ID
                - blood_group: Blood group
                - donation_date: Date of donation
                - hospital_name: Name of hospital
                - hospital_city: Hospital city
                - hospital_district: Hospital district
                - units: Number of units donated
                - donation_id: Donation record ID
                - hospital_id: Hospital ID
                - certificate_number: Pre-generated certificate number (optional)
                - next_eligible_date: Next eligible donation date (optional)
                - gender: Donor gender for eligibility calculation (optional)
        
        Returns:
            tuple: (certificate_filename, certificate_number)
        """
        # Extract donation details
        donor_name = donation_data.get('donor_name', 'Unknown Donor')
        blood_group = donation_data.get('blood_group', 'Unknown')
        donation_date = donation_data.get('donation_date')
        hospital_name = donation_data.get('hospital_name', 'Unknown Hospital')
        hospital_city = donation_data.get('hospital_city', '')
        hospital_district = donation_data.get('hospital_district', '')
        units = donation_data.get('units', 1)
        donation_id = donation_data.get('donation_id')
        hospital_id = donation_data.get('hospital_id')
        donor_id = donation_data.get('donor_id')
        next_eligible_date = donation_data.get('next_eligible_date')
        gender = donation_data.get('gender', '')
        
        # Generate or use provided certificate number
        certificate_number = donation_data.get('certificate_number') or \
                           self.generate_certificate_number(donation_id, hospital_id, donor_id)
        
        # Format date
        if isinstance(donation_date, str):
            try:
                donation_date = datetime.fromisoformat(donation_date.replace('Z', '+00:00'))
            except:
                donation_date = datetime.now()
        
        formatted_date = donation_date.strftime("%B %d, %Y")
        
        # Create filename
        filename = f"{certificate_number}.pdf"
        filepath = os.path.join(self.certificates_dir, filename)
        
        # Create PDF with landscape A4 size
        page_width, page_height = landscape(A4)
        c = canvas.Canvas(filepath, pagesize=landscape(A4))
        
        # Draw border
        border_margin = 0.5 * inch
        c.setStrokeColor(colors.HexColor('#8B0000'))  # Dark red
        c.setLineWidth(3)
        c.rect(border_margin, border_margin, 
               page_width - 2 * border_margin, 
               page_height - 2 * border_margin)
        
        # Inner decorative border
        c.setStrokeColor(colors.HexColor('#DC143C'))  # Crimson
        c.setLineWidth(1)
        inner_margin = border_margin + 0.1 * inch
        c.rect(inner_margin, inner_margin,
               page_width - 2 * inner_margin,
               page_height - 2 * inner_margin)
        
        # Title: Certificate of Appreciation
        c.setFont("Helvetica-Bold", 36)
        c.setFillColor(colors.HexColor('#8B0000'))
        title_text = "CERTIFICATE OF APPRECIATION"
        title_width = c.stringWidth(title_text, "Helvetica-Bold", 36)
        c.drawString((page_width - title_width) / 2, page_height - 1.5 * inch, title_text)
        
        # Subtitle: Blood Donation
        c.setFont("Helvetica", 18)
        c.setFillColor(colors.HexColor('#DC143C'))
        subtitle_text = "For Noble Blood Donation"
        subtitle_width = c.stringWidth(subtitle_text, "Helvetica", 18)
        c.drawString((page_width - subtitle_width) / 2, page_height - 2 * inch, subtitle_text)
        
        # Blood drop icon (simplified)
        c.setFillColor(colors.HexColor('#DC143C'))
        c.circle(page_width / 2, page_height - 2.7 * inch, 0.3 * inch, fill=1)
        
        # Main text: "This is to certify that"
        c.setFont("Helvetica", 14)
        c.setFillColor(colors.black)
        cert_text = "This is to certify that"
        cert_width = c.stringWidth(cert_text, "Helvetica", 14)
        c.drawString((page_width - cert_width) / 2, page_height - 3.5 * inch, cert_text)
        
        # Donor name (emphasized)
        c.setFont("Helvetica-Bold", 24)
        c.setFillColor(colors.HexColor('#8B0000'))
        donor_width = c.stringWidth(donor_name, "Helvetica-Bold", 24)
        c.drawString((page_width - donor_width) / 2, page_height - 4.2 * inch, donor_name)
        
        # Blood group badge
        c.setFont("Helvetica-Bold", 16)
        c.setFillColor(colors.white)
        blood_badge_text = f"Blood Group: {blood_group}"
        blood_width = c.stringWidth(blood_badge_text, "Helvetica-Bold", 16)
        badge_x = (page_width - blood_width) / 2 - 0.3 * inch
        badge_y = page_height - 4.9 * inch
        
        # Draw badge background
        c.setFillColor(colors.HexColor('#DC143C'))
        c.roundRect(badge_x, badge_y - 0.15 * inch, 
                   blood_width + 0.6 * inch, 0.4 * inch, 
                   0.1 * inch, fill=1)
        
        # Draw badge text
        c.setFillColor(colors.white)
        c.drawString(badge_x + 0.3 * inch, badge_y, blood_badge_text)
        
        # Donation details
        c.setFont("Helvetica", 14)
        c.setFillColor(colors.black)
        
        details_y = page_height - 5.6 * inch
        details_text = f"has generously donated {units} unit(s) of blood on {formatted_date}"
        details_width = c.stringWidth(details_text, "Helvetica", 14)
        c.drawString((page_width - details_width) / 2, details_y, details_text)
        
        # Hospital details
        hospital_location = f"{hospital_city}, {hospital_district}" if hospital_city else hospital_district
        hospital_text = f"at {hospital_name}"
        hospital_width = c.stringWidth(hospital_text, "Helvetica", 14)
        c.drawString((page_width - hospital_width) / 2, details_y - 0.35 * inch, hospital_text)
        
        if hospital_location:
            location_width = c.stringWidth(hospital_location, "Helvetica", 14)
            c.drawString((page_width - location_width) / 2, details_y - 0.7 * inch, hospital_location)
        
        # Appreciation message
        c.setFont("Helvetica-Oblique", 12)
        c.setFillColor(colors.HexColor('#555555'))
        appreciation_y = page_height - 6.8 * inch
        appreciation_text = "Your selfless act of kindness has helped save lives and bring hope to those in need."
        appreciation_width = c.stringWidth(appreciation_text, "Helvetica-Oblique", 12)
        c.drawString((page_width - appreciation_width) / 2, appreciation_y, appreciation_text)
        
        thanks_text = "Thank you for being a life saver!"
        thanks_width = c.stringWidth(thanks_text, "Helvetica-Oblique", 12)
        c.drawString((page_width - thanks_width) / 2, appreciation_y - 0.3 * inch, thanks_text)
        
        # Next Eligible Donation Date (if provided)
        if next_eligible_date:
            c.setFont("Helvetica-Bold", 13)
            c.setFillColor(colors.HexColor('#2E7D32'))  # Green color for positive action
            
            # Format next eligible date
            if isinstance(next_eligible_date, str):
                try:
                    next_date_obj = datetime.fromisoformat(next_eligible_date.replace('Z', '+00:00'))
                except:
                    next_date_obj = None
            else:
                next_date_obj = next_eligible_date
            
            if next_date_obj:
                formatted_next_date = next_date_obj.strftime("%B %d, %Y")
                
                # Draw a subtle box for emphasis
                eligible_y = appreciation_y - 0.9 * inch
                eligible_text = f"Next Eligible Donation Date: {formatted_next_date}"
                eligible_width = c.stringWidth(eligible_text, "Helvetica-Bold", 13)
                
                # Background box
                box_padding = 0.3 * inch
                c.setFillColor(colors.HexColor('#E8F5E9'))  # Light green background
                c.roundRect((page_width - eligible_width - box_padding) / 2, 
                           eligible_y - 0.12 * inch,
                           eligible_width + box_padding,
                           0.35 * inch,
                           0.1 * inch,
                           fill=1, stroke=0)
                
                # Text
                c.setFillColor(colors.HexColor('#2E7D32'))
                c.drawString((page_width - eligible_width) / 2, eligible_y, eligible_text)
                
                # Add helpful note
                c.setFont("Helvetica", 9)
                c.setFillColor(colors.HexColor('#666666'))
                note_text = f"{'Male' if gender == 'male' else 'Female' if gender == 'female' else 'Donors'} can donate blood every {'90' if gender == 'male' else '120'} days"
                note_width = c.stringWidth(note_text, "Helvetica", 9)
                c.drawString((page_width - note_width) / 2, eligible_y - 0.3 * inch, note_text)
        
        # Certificate number and issue date
        c.setFont("Helvetica", 10)
        c.setFillColor(colors.HexColor('#666666'))
        footer_y = border_margin + 0.8 * inch
        
        cert_num_text = f"Certificate No: {certificate_number}"
        c.drawString(border_margin + 0.5 * inch, footer_y, cert_num_text)
        
        issue_date_text = f"Issued on: {datetime.now().strftime('%B %d, %Y')}"
        issue_width = c.stringWidth(issue_date_text, "Helvetica", 10)
        c.drawString(page_width - border_margin - 0.5 * inch - issue_width, footer_y, issue_date_text)
        
        # Signature line (placeholder)
        signature_y = border_margin + 1.8 * inch
        c.setLineWidth(1)
        c.setStrokeColor(colors.black)
        signature_x = page_width - border_margin - 3 * inch
        c.line(signature_x, signature_y, signature_x + 2 * inch, signature_y)
        
        c.setFont("Helvetica", 10)
        c.setFillColor(colors.black)
        auth_text = "Authorized Signature"
        auth_width = c.stringWidth(auth_text, "Helvetica", 10)
        c.drawString(signature_x + (2 * inch - auth_width) / 2, signature_y - 0.25 * inch, auth_text)
        
        # Save PDF
        c.save()
        
        return filename, certificate_number
    
    def get_certificate_path(self, filename):
        """Get full path to certificate file"""
        return os.path.join(self.certificates_dir, filename)
    
    def certificate_exists(self, filename):
        """Check if certificate file exists"""
        filepath = self.get_certificate_path(filename)
        return os.path.exists(filepath)


# Singleton instance
_certificate_service = None


def get_certificate_service():
    """Get or create certificate service singleton"""
    global _certificate_service
    if _certificate_service is None:
        # Use absolute path relative to backend directory
        from flask import current_app
        try:
            certificates_dir = os.path.join(current_app.root_path, '..', 'certificates')
        except:
            # Fallback if not in app context
            certificates_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), '..', 'certificates')
        
        certificates_dir = os.path.abspath(certificates_dir)
        _certificate_service = CertificateService(certificates_dir)
    
    return _certificate_service
