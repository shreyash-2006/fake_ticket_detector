for database 
CREATE DATABASE ticket_system;
USE ticket_system;
CREATE TABLE tickets (
    ticket_id VARCHAR(50) PRIMARY KEY,
    source VARCHAR(100) NOT NULL,
    destn VARCHAR(100) NOT NULL,
    passenger INT NOT NULL,
    booked_on DATETIME NOT NULL,
    expiry_time DATETIME NOT NULL,
    class INT NOT NULL,
    ticket_price FLOAT NOT NULL
);
INSERT INTO tickets VALUES
('TICK123', 'Mumbai', 'Pune', 2, '2026-02-20 10:00:00', '2026-12-31 23:59:59', 1, 250.0),
('TICK999', 'Delhi', 'Agra', 1, '2026-01-10 09:00:00', '2026-01-15 23:59:59', 2, 150.0);

raeed bhai please implement it
