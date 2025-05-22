use `m426menappsql1`;

drop table gerichte;
create TABLE gerichte (
    ID int PRIMARY KEY auto_increment,
    Name varchar(100) NOT NULL,
    Beschreibung varchar(100),
    Preis DECIMAL(5,2),
    Allergene varchar(100),
    Hinweise varchar(100),
    Tag DATE NOT NULL
);

INSERT INTO gerichte (name, beschreibung, preis, allergene, hinweise, tag) VALUES
('Spaghetti Bolognese', 'Mit Rinderhackfleisch und Tomatensauce', 5.50, 'Gluten, Sellerie', '', '2025-05-22'),
('Gemüse-Curry', 'Mit Kokosmilch und Basmatireis', 4.80, '', 'vegan', '2025-05-22');
