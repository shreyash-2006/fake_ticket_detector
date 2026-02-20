import cv2
import pytesseract
import re
from datetime import datetime

# CHANGE THIS PATH
pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"


def extract_ticket_data(image_path):
    img = cv2.imread(image_path)

    # improve OCR accuracy
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    gray = cv2.GaussianBlur(gray, (5,5), 0)
    _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

    text = pytesseract.image_to_string(thresh)

    # RailOne-specific parsing

    # Ticket ID 
    ticket_id_match = re.search(r'\b[A-Z0-9]{8,12}\b', text)

    # Source → Destination
    route_match = re.search(r'([A-Z]{3,})\s*[-—–]\s*([A-Z]{3,})', text)

    # Passenger
    passenger_match = re.search(r'(\d+)\s*Adult', text, re.IGNORECASE)

    # Valid till
    valid_match = re.search(
        r'Valid Till\s*(\d{2}/\d{2}/\d{4}\s*\d{2}:\d{2})',
        text,
        re.IGNORECASE
    )

    return {
        "ticket_id": ticket_id_match.group(0) if ticket_id_match else None,
        "source": route_match.group(1) if route_match else None,
        "destn": route_match.group(2) if route_match else None,
        "passenger": int(passenger_match.group(1)) if passenger_match else None,
        "valid_till": valid_match.group(1) if valid_match else None,
        "raw_text": text
    }