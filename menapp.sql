CREATE TABLE gerichte (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    beschreibung TEXT,
    preis DECIMAL(5,2) NOT NULL,
    allergene SET(
        'Gluten', 'Ei', 'Milch', 'Soja', 'Nüsse',
        'Sellerie', 'Fisch', 'Krebstiere', 'Sesam',
        'Lupinen', 'Senf', 'Schwefeldioxid'
    ),
    hinweise VARCHAR(255)
);


CREATE TABLE speiseplan (
    id INT AUTO_INCREMENT PRIMARY KEY,
    datum DATE NOT NULL,
    gericht_id INT NOT NULL,
    FOREIGN KEY (gericht_id) REFERENCES gerichte(id) ON DELETE CASCADE
);



für alle an einem tag
SELECT g.name, g.beschreibung, g.preis, g.allergene, g.hinweise
FROM speiseplan s
JOIN gerichte g ON s.gericht_id = g.id
WHERE s.datum = '2025-05-16';


