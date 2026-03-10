import sqlite3


conn = sqlite3.connect('railway_updatede.db')
cursor = conn.cursor()


cursor.execute('''
    CREATE TABLE IF NOT EXISTS passengers (
        ticket_id TEXT PRIMARY KEY,
        source TEXT,
        destination TEXT,
        passenger_quantity integer,
        booked_on date,
        expiry_date date,
        class integer,
        ticket_price float,
        verified bool     
    )'''
)
conn.commit()
conn.close()
print("Database created")
