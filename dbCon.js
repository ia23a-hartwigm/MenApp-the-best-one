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
        // Überprüfen, ob bereits ein nicht abgeholter Eintrag existiert
        const checkSql = 'SELECT ID, menge FROM warenkorb WHERE userID = ? AND gerichtID = ? AND abgeholt = FALSE LIMIT 1';
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


module.exports = {
    getTest,
    getMenuByDay: getMenuById,
    addToCart,
    removeAllFromCart,
    getMenuForWeek,
    getUserByEmail,
    getUserById,
    createUser,

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
