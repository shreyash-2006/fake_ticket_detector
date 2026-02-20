from flask import Flask, request, jsonify, render_template
import mysql.connector
from datetime import datetime

app = Flask(__name__)

# MySQL Connection
def get_db():
    return mysql.connector.connect(
        host="localhost",
        user="root",
        password="YOUR_PASSWORD",
        database="ticket_system"
    )

# Home Page
@app.route("/")
def home():
    return render_template("index.html")

# Ticket Verification API
@app.route("/verify-ticket", methods=["POST"])
def verify_ticket():
    data = request.json
    ticket_id = data.get("ticket_id")
    source = data.get("source")
    destn = data.get("destn")

    conn = get_db()
    cursor = conn.cursor(dictionary=True)

    # 1: Check ticket exists
    cursor.execute("SELECT * FROM tickets WHERE ticket_id = %s", (ticket_id,))
    ticket = cursor.fetchone()

    if not ticket:
        return jsonify({"status": "invalid", "message": "Ticket ID not found"})

    # 2: Check expiry
    if datetime.now() > ticket["expiry_time"]:
        return jsonify({"status": "invalid", "message": "Ticket expired"})

    # 3: Check route
    if (ticket["source"].lower() != source.lower() or
        ticket["destn"].lower() != destn.lower()):
        return jsonify({"status": "invalid", "message": "Route mismatch"})

    return jsonify({"status": "valid", "message": "Ticket valid"})


if __name__ == "__main__":
    app.run(debug=True)