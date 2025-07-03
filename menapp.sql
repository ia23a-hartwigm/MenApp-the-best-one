# DROP DATABASE IF EXISTS m426menappsql1;
CREATE DATABASE IF NOT EXISTS m426menappsql1;
use `m426menappsql1`;

drop table gerichte;
CREATE TABLE gerichte (
    ID INT PRIMARY KEY AUTO_INCREMENT,
    Name VARCHAR(100) NOT NULL,
    Beschreibung VARCHAR(100),
    Preis DECIMAL(5,2),
    Allergene SET('Gluten', 'Laktose', 'Nüsse', 'Eier', 'Soja', 'Fisch', 'Sellerie') NOT NULL,
    Hinweise VARCHAR(100),
    Tag DATE NOT NULL
);

CREATE TABLE users (
    ID INT PRIMARY KEY AUTO_INCREMENT,
    Name VARCHAR(100) NOT NULL,
    Email VARCHAR(100) NOT NULL UNIQUE,
    Passwort VARCHAR(100) NOT NULL,
    IsAdmin BOOLEAN DEFAULT FALSE
);

INSERT INTO gerichte (name, beschreibung, preis, allergene, hinweise, tag) VALUES
('Spaghetti Bolognese', 'Mit Rinderhackfleisch und Tomatensauce', 5.50, 'Gluten,Sellerie', '', '2025-06-07'),
('Gemüse-Curry', 'Mit Kokosmilch und Basmatireis', 4.80, 'Eier', 'vegan', '2025-06-14');


CREATE TABLE users (    ID INT PRIMARY KEY AUTO_INCREMENT,    Name VARCHAR(100) NOT NULL,    Email VARCHAR(100) NOT NULL UNIQUE,    Passwort VARCHAR(100) NOT NULL);
INSERT INTO users (name, email, passwort) VALUES('Max Mustermann', 'max@muster.com', 'geheim123'),('Erika Musterfrau', 'erika@muster.com', 'geheim456');

-- make me a table that represents a warenkorb with the following columns: id, gerichtID, menge, userID, bestelltAm, abgeholtAm, abgeholt, abholezeit, bezahlt, bezahltAm
DROP TABLE IF EXISTS warenkorb;
CREATE TABLE warenkorb (
    ID INT PRIMARY KEY AUTO_INCREMENT,
    gerichtID INT NOT NULL,
    menge INT NOT NULL,
    userID INT NOT NULL,
    bestelltAm DATETIME DEFAULT CURRENT_TIMESTAMP,
    abgeholtAm DATETIME,
    abgeholt BOOLEAN DEFAULT FALSE,
    abholezeit TIME,
    bezahlt BOOLEAN DEFAULT FALSE,
    bezahltAm DATETIME,
    FOREIGN KEY (gerichtID) REFERENCES gerichte(ID),
    FOREIGN KEY (userID) REFERENCES users(ID)
);
INSERT INTO users (name, email, passwort) VALUES
('Max Mustermann', 'max@muster.com', 'geheim123'),
('Erika Musterfrau', 'erika@muster.com', 'geheim456');