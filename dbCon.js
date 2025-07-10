const mysql = require('mysql2/promise');
require('dotenv').config();



// Create a connection pool for better performance and connection management
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    timezone: 'Europe/Zurich' // Hier deine lokale Zeitzone einstellen
});


async function getTest() {
    try {
        return await executeQuery('SELECT * FROM test');
    } catch (error) {
        console.error('Error fetching all tests:', error);
        throw error;
    }
}


async function getMenuById(id) {
    try {
        return await executeQuery('SELECT * FROM gerichte WHERE ID = ?', [id]);
    } catch (error) {
        console.error('Error fetching menu by day:', error);
        throw error;
    }
}

async function getMenu(startDate) {
    try {
        return await executeQuery(
            'SELECT * FROM gerichte WHERE Tag >= ? AND Tag ORDER BY Tag ASC',
            [startDate]

        );
    } catch (error) {
        console.error('Error fetching menu for week:', error);
        throw error;
    }
}


async function getMenuForWeek(startDate) {
    try {
        return await executeQuery(
            'SELECT * FROM gerichte WHERE Tag >= ? AND Tag < DATE_ADD(?, INTERVAL 7 DAY) ORDER BY Tag ASC',
            [startDate, startDate]

        );
    } catch (error) {
        console.error('Error fetching menu for week:', error);
        throw error;
    }
}

async function addToCart(userId, menuItemId, menge) {
    try {
        // Überprüfen, ob bereits ein Eintrag existiert
        const checkSql = 'SELECT ID, menge FROM warenkorb WHERE userID = ? AND gerichtID = ? LIMIT 1';
        const existingItems = await executeQuery(checkSql, [userId, menuItemId]);

        if (existingItems && existingItems.length > 0) {
            // Eintrag existiert bereits, Menge aktualisieren
            const existingItem = existingItems[0];
            const newMenge = parseInt(existingItem.menge) + parseInt(menge);

            const updateSql = 'UPDATE warenkorb SET menge = ? WHERE ID = ?';
            await executeQuery(updateSql, [newMenge, existingItem.ID]);
        } else {
            // Kein Eintrag vorhanden, neuen erstellen
            const insertSql = 'INSERT INTO warenkorb (userID, gerichtID, menge) VALUES (?, ?, ?)';
            await executeQuery(insertSql, [userId, menuItemId, menge]);
        }

        return { success: true };
    } catch (error) {
        console.error('Error adding item to cart:', error);
        throw error;
    }
}

async function removeAllFromCart(userId, warenKorbId) {
    try {
        // Prüfen, ob der Eintrag existiert und dem Benutzer gehört
        const checkSql = 'SELECT ID FROM warenkorb WHERE ID = ? AND userID = ? LIMIT 1';
        const existingItems = await executeQuery(checkSql, [warenKorbId, userId]);

        if (existingItems && existingItems.length > 0) {
            // Eintrag existiert und gehört dem Benutzer, also löschen
            const deleteSql = 'DELETE FROM warenkorb WHERE ID = ?';
            await executeQuery(deleteSql, [warenKorbId]);
            return { success: true };
        } else {
            // Eintrag existiert nicht oder gehört nicht dem Benutzer
            return { success: false, error: 'Element nicht gefunden oder keine Berechtigung' };
        }
    } catch (error) {
        console.error('Error removing item from cart:', error);
        throw error;
    }
}

async function getUserByEmail(email) {
    const [rows] = await pool.query('SELECT * FROM users WHERE Email = ?', [email]);
    return rows[0];
}

async function getUserById(id) {
    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
    return rows[0];
}

async function createUser(name, email, passwort) {
    await pool.query(
        'INSERT INTO users (Name, Email, Passwort) VALUES (?, ?, ?)',
        [name, email, passwort]
    );
}

async function getWarenkorbByUser (userId) {
    try {
        return await executeQuery(
            'SELECT g.Name AS gerichtName, w.menge FROM warenkorb w JOIN gerichte g ON g.ID = w.gerichtID WHERE w.userID = ?',
            [userId]
        );
    } catch (error) {
        console.error('Error fetching menu for week:', error);
        throw error;
    }
}

// Funktion zum Abrufen aller aktiven Bestellungen
async function getActiveOrders() {
    try {
        return await executeQuery(`
            SELECT 
                b.userID, 
                MAX(b.bestelltAm) as bestelltAm, 
                b.bezahlt, 
                u.Name as userName,
                DATE(b.bestelltAm) as bestellDatum,
                GROUP_CONCAT(g.Name SEPARATOR ', ') as gerichtListe,
                GROUP_CONCAT(b.menge SEPARATOR ', ') as mengenListe,
                GROUP_CONCAT(b.ID SEPARATOR ', ') as bestellIDs,
                GROUP_CONCAT(g.ID SEPARATOR ', ') as gerichtIDs
            FROM bestellungen b
            JOIN gerichte g ON b.gerichtID = g.ID
            JOIN users u ON b.userID = u.ID
            WHERE b.abgeholt = 0
            GROUP BY b.userID, DATE(b.bestelltAm), b.bezahlt, u.Name
            ORDER BY MAX(b.bestelltAm) DESC
        `);
    } catch (error) {
        console.error('Error fetching active orders:', error);
        throw error;
    }
}

// Funktion zum Abrufen aller abgeschlossenen Bestellungen
async function getCompletedOrders() {
    try {
        return await executeQuery(`
            SELECT 
                b.userID, 
                MAX(b.bestelltAm) as bestelltAm, 
                MAX(b.abgeholtAm) as abgeholtAm, 
                b.bezahlt, 
                MAX(b.bezahltAm) as bezahltAm,
                u.Name as userName,
                DATE(b.bestelltAm) as bestellDatum,
                GROUP_CONCAT(g.Name SEPARATOR ', ') as gerichtListe,
                GROUP_CONCAT(b.menge SEPARATOR ', ') as mengenListe,
                GROUP_CONCAT(b.ID SEPARATOR ', ') as bestellIDs,
                GROUP_CONCAT(g.ID SEPARATOR ', ') as gerichtIDs
            FROM bestellungen b
            JOIN gerichte g ON b.gerichtID = g.ID
            JOIN users u ON b.userID = u.ID
            WHERE b.abgeholt = 1
            GROUP BY b.userID, DATE(b.bestelltAm), b.bezahlt, u.Name
            ORDER BY MAX(b.abgeholtAm) DESC
            LIMIT 100
        `);
    } catch (error) {
        console.error('Error fetching completed orders:', error);
        throw error;
    }
}

// Funktion zum Markieren einer Bestellung als abgeholt
async function markOrderAsCompleted(orderId) {
    try {
        const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

        // Alle Bestellungen mit derselben Benutzer-ID und demselben Datum markieren
        // Zuerst die Bestellung abrufen, um Benutzer-ID und Datum zu ermitteln
        const orderResult = await executeQuery(
            'SELECT userID, DATE(bestelltAm) as bestellDatum FROM bestellungen WHERE ID = ?',
            [orderId]
        );

        if (!orderResult || orderResult.length === 0) {
            return { success: false };
        }

        const { userID, bestellDatum } = orderResult[0];

        // Dann alle Bestellungen mit derselben Benutzer-ID und demselben Datum aktualisieren
        const result = await executeQuery(
            'UPDATE bestellungen SET abgeholt = 1, abgeholtAm = ? WHERE userID = ? AND DATE(bestelltAm) = ?',
            [now, userID, bestellDatum]
        );

        return { success: result.affectedRows > 0 };
    } catch (error) {
        console.error('Error marking order as completed:', error);
        throw error;
    }
}

// Funktion zum Markieren einer Bestellung als bezahlt
async function markOrderAsPaid(orderId) {
    try {
        const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

        // Alle Bestellungen mit derselben Benutzer-ID und demselben Datum markieren
        // Zuerst die Bestellung abrufen, um Benutzer-ID und Datum zu ermitteln
        const orderResult = await executeQuery(
            'SELECT userID, DATE(bestelltAm) as bestellDatum FROM bestellungen WHERE ID = ?',
            [orderId]
        );

        if (!orderResult || orderResult.length === 0) {
            return { success: false };
        }

        const { userID, bestellDatum } = orderResult[0];

        // Dann alle Bestellungen mit derselben Benutzer-ID und demselben Datum aktualisieren
        const result = await executeQuery(
            'UPDATE bestellungen SET bezahlt = 1, bezahltAm = ? WHERE userID = ? AND DATE(bestelltAm) = ?',
            [now, userID, bestellDatum]
        );

        return { success: result.affectedRows > 0 };
    } catch (error) {
        console.error('Error marking order as paid:', error);
        throw error;
    }
}

// Funktion zum Abrufen aktiver (nicht abgeholter) Bestellungen eines Benutzers
async function getAktiveBestellungenByUser(userId) {
    try {
        return await executeQuery(`
            SELECT 
                DATE(b.bestelltAm) as bestellDatum,
                MAX(b.bestelltAm) as bestelltAm, 
                b.bezahlt,
                GROUP_CONCAT(g.Name SEPARATOR ', ') as gerichtListe,
                GROUP_CONCAT(b.menge SEPARATOR ', ') as mengenListe
            FROM bestellungen b 
            JOIN gerichte g ON g.ID = b.gerichtID 
            WHERE b.userID = ? AND b.abgeholt = 0
            GROUP BY DATE(b.bestelltAm), b.bezahlt
            ORDER BY MAX(b.bestelltAm) DESC
        `, [userId]);
    } catch (error) {
        console.error('Error fetching active orders for user:', error);
        throw error;
    }
}

// Funktion zum Abrufen abgeschlossener (abgeholter) Bestellungen eines Benutzers
async function getAbgeschlosseneBestellungenByUser(userId) {
    try {
        return await executeQuery(`
            SELECT 
                DATE(b.bestelltAm) as bestellDatum,
                MAX(b.abgeholtAm) as abgeholtAm,
                GROUP_CONCAT(g.Name SEPARATOR ', ') as gerichtListe,
                GROUP_CONCAT(b.menge SEPARATOR ', ') as mengenListe
            FROM bestellungen b 
            JOIN gerichte g ON g.ID = b.gerichtID 
            WHERE b.userID = ? AND b.abgeholt = 1
            GROUP BY DATE(b.bestelltAm)
            ORDER BY MAX(b.abgeholtAm) DESC
        `, [userId]);
    } catch (error) {
        console.error('Error fetching completed orders for user:', error);
        throw error;
    }
}

// Neue Funktion zur Erstellung einer Bestellung aus dem Warenkorb
async function createBestellungFromWarenkorb(userId) {
    const connection = await pool.getConnection();
    try {
        // Transaktion starten
        await connection.beginTransaction();

        // 1. Warenkorb-Einträge des Benutzers abrufen
        const warenkorbItems = await connection.query(
            'SELECT gerichtID, menge FROM warenkorb WHERE userID = ?',
            [userId]
        );

        if (!warenkorbItems[0] || warenkorbItems[0].length === 0) {
            throw new Error('Der Warenkorb ist leer');
        }

        // 2. Für jeden Warenkorb-Eintrag eine Bestellung erstellen
        for (const item of warenkorbItems[0]) {
            await connection.query(
                'INSERT INTO bestellungen (gerichtID, menge, userID) VALUES (?, ?, ?)',
                [item.gerichtID, item.menge, userId]
            );
        }

        // 3. Warenkorb des Benutzers leeren
        await connection.query(
            'DELETE FROM warenkorb WHERE userID = ?',
            [userId]
        );

        // Transaktion abschließen
        await connection.commit();
        return { success: true };
    } catch (error) {
        // Bei Fehler: Transaktion zurückrollen
        await connection.rollback();
        console.error('Error creating order from cart:', error);
        throw error;
    } finally {
        // Verbindung zurückgeben
        connection.release();
    }
}

async function createMenu(menuData) {
    try {
        const { name, beschreibung, preis, tag, allergene, hinweise } = menuData;

        // Für MySQL SET-Typ muss allergene eine kommagetrennte Liste von gültigen Werten sein
        // Die gültigen Werte sind: 'Gluten', 'Laktose', 'Nüsse', 'Eier', 'Soja', 'Fisch', 'Sellerie'
        let allergenValues = '';
        if (allergene && allergene.trim()) {
            // allergene ist bereits eine kommagetrennte Liste von gültigen Werten aus den Checkboxen
            allergenValues = allergene.trim();
        }

        const trimmedHinweise = hinweise ? hinweise.substring(0, 100) : '';

        console.log('Speichere in DB:', {
            name,
            beschreibung,
            preis,
            tag,
            allergene: allergenValues,
            hinweise: trimmedHinweise
        });

        return await executeQuery(
            'INSERT INTO gerichte (Name, Beschreibung, Preis, Tag, Allergene, Hinweise) VALUES (?, ?, ?, ?, ?, ?)',
            [name, beschreibung, preis, tag, allergenValues, trimmedHinweise]
        );
    } catch (error) {
        console.error('Error creating new menu:', error);
        throw error;
    }
}

async function updateMenu(menuId, menuData) {
    try {
        const { name, beschreibung, preis, tag, allergene, hinweise } = menuData;

        // Für MySQL SET-Typ muss allergene eine kommagetrennte Liste von gültigen Werten sein
        let allergenValues = '';
        if (allergene && allergene.trim()) {
            allergenValues = allergene.trim();
        }

        const trimmedHinweise = hinweise ? hinweise.substring(0, 100) : '';

        console.log('Aktualisiere in DB:', {
            id: menuId,
            name,
            beschreibung,
            preis,
            tag,
            allergene: allergenValues,
            hinweise: trimmedHinweise
        });

        return await executeQuery(
            'UPDATE gerichte SET Name = ?, Beschreibung = ?, Preis = ?, Tag = ?, Allergene = ?, Hinweise = ? WHERE ID = ?',
            [name, beschreibung, preis, tag, allergenValues, trimmedHinweise, menuId]
        );
    } catch (error) {
        console.error('Error updating menu:', error);
        throw error;
    }
}

async function deleteMenu(menuId) {
    try {
        console.log('Lösche Menü aus DB:', menuId);

        // Prüfen, ob das Menü in einem Warenkorb verwendet wird
        const cartItems = await executeQuery(
            'SELECT COUNT(*) as count FROM warenkorb WHERE gerichtID = ?',
            [menuId]
        );

        if (cartItems && cartItems[0] && cartItems[0].count > 0) {
            throw new Error('Dieses Menü kann nicht gelöscht werden, da es bereits in Warenkörben verwendet wird.');
        }

        return await executeQuery('DELETE FROM gerichte WHERE ID = ?', [menuId]);
    } catch (error) {
        console.error('Error deleting menu:', error);
        throw error;
    }
}

// Funktion zum Abrufen aller Admin-Benutzer
async function getAdminUsers() {
    try {
        return await executeQuery(
            'SELECT ID, Name, Email FROM users WHERE IsAdmin = 1 ORDER BY ID'
        );
    } catch (error) {
        console.error('Error fetching admin users:', error);
        throw error;
    }
}

// Funktion zum Erstellen eines neuen Admin-Benutzers
async function createAdminUser(name, email, password) {
    try {
        // Prüfen, ob die E-Mail bereits existiert
        const existingUser = await getUserByEmail(email);
        if (existingUser) {
            throw new Error('Ein Benutzer mit dieser E-Mail existiert bereits');
        }

        return await executeQuery(
            'INSERT INTO users (Name, Email, Passwort, IsAdmin) VALUES (?, ?, ?, 1)',
            [name, email, password]
        );
    } catch (error) {
        console.error('Error creating admin user:', error);
        throw error;
    }
}

// Funktion zum Aktualisieren des Benutzerpassworts
async function updateUserPassword(userId, newPassword) {
    try {
        return await executeQuery(
            'UPDATE users SET Passwort = ? WHERE ID = ?',
            [newPassword, userId]
        );
    } catch (error) {
        console.error('Error updating user password:', error);
        throw error;
    }
}

// Funktion zum Abrufen aller normalen Benutzer (keine Admins)
async function getRegularUsers() {
    try {
        return await executeQuery(
            'SELECT ID, Name, Email FROM users WHERE IsAdmin = 0 ORDER BY ID'
        );
    } catch (error) {
        console.error('Error fetching regular users:', error);
        throw error;
    }
}

// Funktion zum Befördern eines Benutzers zum Admin
async function promoteUserToAdmin(userId) {
    try {
        // Prüfen, ob der Benutzer existiert
        const user = await getUserById(userId);
        if (!user) {
            throw new Error('Benutzer nicht gefunden');
        }

        // Prüfen, ob der Benutzer bereits Admin ist
        if (user.IsAdmin === 1) {
            throw new Error('Benutzer ist bereits Administrator');
        }

        // Benutzer zum Admin befördern
        return await executeQuery(
            'UPDATE users SET IsAdmin = 1 WHERE ID = ?',
            [userId]
        );
    } catch (error) {
        console.error('Error promoting user to admin:', error);
        throw error;
    }
}

module.exports = {
    getTest,
    getMenu,
    getMenuByDay: getMenuById,
    getMenuById,
    addToCart,
    removeAllFromCart,
    getMenuForWeek,
    getUserByEmail,
    getUserById,
    createUser,
    getWarenkorbByUser,
    getActiveOrders,
    getCompletedOrders,
    markOrderAsCompleted,
    markOrderAsPaid,
    getAktiveBestellungenByUser,
    getAbgeschlosseneBestellungenByUser,
    createBestellungFromWarenkorb,
    createMenu,
    updateMenu,
    deleteMenu,
    // Admin-Benutzerverwaltung
    getAdminUsers,
    createAdminUser,
    // Funktionen für die Beförderung zum Admin
    getRegularUsers,
    promoteUserToAdmin,
    // Funktion für Passwortänderung
    updateUserPassword
};

async function executeQuery(sql, params = []) {
    try {
        const [rows] = await pool.query(sql, params);
        return rows;
    } catch (error) {
        console.error('Database query error:', error);
        throw error; // Re-throw to allow handling in the calling function
    }
}



// dbCon.js
