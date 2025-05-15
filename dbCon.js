const mysql = require('mysql2/promise');

// Create a connection pool for better performance and connection management
const pool = mysql.createPool({
    host: '127.0.0.1',
    port: '3306',
    user: 'root',
    password: 'skillsbattle',
    database: 'labyrinth',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

async function getTest() {
    try {
        return await executeQuery('SELECT * FROM test');
    } catch (error) {
        console.error('Error fetching all tests:', error);
        throw error;
    }
}



// Export the database functions
module.exports = {
    getTest
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
