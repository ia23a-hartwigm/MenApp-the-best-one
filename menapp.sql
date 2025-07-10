# DROP DATABASE IF EXISTS m426menappsql1;
CREATE DATABASE IF NOT EXISTS m426menappsql1;
USE `m426menappsql1`;

-- Shopping cart table (temporary, unfinalized items)
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS warenkorb;
DROP TABLE IF EXISTS gerichte;
DROP TABLE IF EXISTS bestellungen;


-- Users table
CREATE TABLE users
(
    ID       INT PRIMARY KEY AUTO_INCREMENT,
    Name     VARCHAR(100) NOT NULL,
    Email    VARCHAR(100) NOT NULL UNIQUE,
    Passwort VARCHAR(100) NOT NULL,
    IsAdmin  BOOLEAN DEFAULT FALSE
);


-- Drop and recreate tables
CREATE TABLE gerichte
(
    ID           INT PRIMARY KEY AUTO_INCREMENT,
    Name         VARCHAR(100)                                                            NOT NULL,
    Beschreibung VARCHAR(100),
    Preis        DECIMAL(5, 2),
    Allergene    SET ('Gluten', 'Laktose', 'Nüsse', 'Eier', 'Soja', 'Fisch', 'Sellerie') NOT NULL,
    Hinweise     VARCHAR(100),
    Tag          DATE                                                                    NOT NULL
);


-- Shopping cart table
CREATE TABLE warenkorb
(
    ID        INT PRIMARY KEY AUTO_INCREMENT,
    gerichtID INT NOT NULL,
    menge     INT NOT NULL,
    userID    INT NOT NULL,
    FOREIGN KEY (gerichtID) REFERENCES gerichte (ID),
    FOREIGN KEY (userID) REFERENCES users (ID)
);


-- Finalized orders table
CREATE TABLE bestellungen
(
    ID         INT PRIMARY KEY AUTO_INCREMENT,
    gerichtID  INT NOT NULL,
    menge      INT NOT NULL,
    userID     INT NOT NULL,
    bestelltAm DATETIME DEFAULT CURRENT_TIMESTAMP,
    abgeholtAm DATETIME,
    abgeholt   BOOLEAN  DEFAULT FALSE,
    abholzeit  TIME,
    bezahlt    BOOLEAN  DEFAULT FALSE,
    bezahltAm  DATETIME,
    FOREIGN KEY (gerichtID) REFERENCES gerichte (ID),
    FOREIGN KEY (userID) REFERENCES users (ID)
);


-- Seed data for gerichte and users
INSERT INTO gerichte (name, beschreibung, preis, allergene, hinweise, tag)
VALUES ('Spaghetti Bolognese', 'Mit Rinderhackfleisch und Tomatensauce', 5.50, 'Gluten,Sellerie', '', '2025-06-07'),
       ('Gemüse-Curry', 'Mit Kokosmilch und Basmatireis', 4.80, 'Eier', 'vegan', '2025-06-14');


