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
    Passwort VARCHAR(100) NOT NULL
);

INSERT INTO gerichte (name, beschreibung, preis, allergene, hinweise, tag) VALUES
('Spaghetti Bolognese', 'Mit Rinderhackfleisch und Tomatensauce', 5.50, 'Gluten,Sellerie', '', '2025-06-07'),
('Gemüse-Curry', 'Mit Kokosmilch und Basmatireis', 4.80, 'Eier', 'vegan', '2025-06-14');

INSERT INTO users (name, email, passwort) VALUES
('Max Mustermann', 'max@muster.com', 'geheim123'),
('Erika Musterfrau', 'erika@muster.com', 'geheim456');