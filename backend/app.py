from flask import Flask, render_template, request, jsonify
import mysql.connector
import os
from datetime import datetime
from ocr_utils import extract_ticket_data

app = Flask(__name__)
UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
# MySQL connection
def get_db():
    return mysql.connector.connect(
        host="localhost",
        user="root",
        password="YOUR_PASSWORD",
        database="ticket_system"
    )

@app.route("/")
def home():
    return render_template("index.html")

# LIVE SCAN + VERIFY
@app.route("/scan-and-verify", methods=["POST"])
def scan_and_verify():
    file = request.files["image"]
    path = os.path.join(UPLOAD_FOLDER, file.filename)
    file.save(path)

    # OCR extract
    data = extract_ticket_data(path)

    if not data["ticket_id"]:
        return jsonify({"status": "invalid", "message": "Could not read ticket"})

    # DB verify
    conn = get_db()
    cursor = conn.cursor(dictionary=True)

    cursor.execute(
        "SELECT * FROM tickets WHERE ticket_id = %s",
        (data["ticket_id"],)
    )
    ticket = cursor.fetchone()

    if not ticket:
        return jsonify({"status": "invalid", "message": "Fake Ticket (ID not found)"})

    if datetime.now() > ticket["expiry_time"]:
        return jsonify({"status": "invalid", "message": "Ticket expired"})

    if (data["source"] and
        (ticket["source"].lower() != data["source"].lower() or
         ticket["destn"].lower() != data["destn"].lower())):
        return jsonify({"status": "invalid", "message": "Route mismatch"})

    return jsonify({
        "status": "valid",
        "message": "✅ Genuine Ticket",
        "extracted": data
    })


if __name__ == "__main__":
    app.run(debug=True)
