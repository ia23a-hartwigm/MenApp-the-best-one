const express = require('express');
const bodyParser = require('body-parser');
const dbCon = require('./dbCon.js');
const crypto = require('crypto');
const app = express();
const port = process.env.SERVER_PORT;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(__dirname + "/public"));


app.get('/api/testDB', async (req, res) => {
    try {
        const test = await dbCon.getTest();
        res.json(test);
    } catch (error) {
        console.error('Fehler beim Abrufen der tests:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Serverfehler beim Abrufen der tests'
        });
    }
});

app.get('/api/menu/id/:id', async (req, res) => {
    try {
        const menu = await dbCon.getMenuByDay(req.params.id);
        res.json(menu);
    } catch (error) {
        res.status(500).json({ success: false, error: 'Fehler beim Abrufen des Tagesmenüs' });
    }
});

app.get('/api/test', async (req, res) => {
    try {
        res.json('Test from the Server')
    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            error: 'Serverfehler'
        })
    }
})


app.get('/api/menu/week/:startDate?', async (req, res) => {
    try {
        let startDate = req.params.startDate;
        if (!startDate) {
            const today = new Date();
            startDate = today.toISOString().split('T')[0]; // YYYY-MM-DD
        }
        const menu = await dbCon.getMenuForWeek(startDate);
        res.json(menu);
    } catch (error) {
        res.status(500).json({ success: false, error: 'Fehler beim Abrufen des Wochenmenüs' });
    }
});

const session = require('express-session');

app.use(session({
    secret: 'dein_geheimes_session_secret',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
}));

app.use(express.static(__dirname + "/public"));

app.post('/api/login', async (req, res) => {
    const { email, passwort } = req.body;
    try {
        const user = await dbCon.getUserByEmail(email);
        const hashedInput = hashPassword(passwort);

        if (user && user.Passwort === hashedInput) {
            // Password is correct
            req.session.userId = user.ID;
            res.json({ success: true, message: 'Login erfolgreich' });
        } else {
            // Wrong password
            res.status(401).json({ success: false, message: 'Ungültige Anmeldedaten' });
        }

    } catch (error) {
        res.status(500).json({ success: false, message: 'Serverfehler beim Login' });
    }
});

app.get('/api/session', (req, res) => {
    if (req.session.userId) {
        res.json({ loggedIn: true, userId: req.session.userId });
    } else {
        res.json({ loggedIn: false });
    }
});

app.get('/api/user/name', async (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ success: false, message: 'Nicht eingeloggt' });
    }
    try {
        const user = await dbCon.getUserById(req.session.userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'Benutzer nicht gefunden' });
        }
        res.json({ success: true, name: user.Name });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Serverfehler beim Abrufen des Benutzernamens' });
    }
});


app.post('/api/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Fehler beim Ausloggen' });
        }
        res.clearCookie('connect.sid'); // Name des Session-Cookies
        res.json({ success: true, message: 'Erfolgreich ausgeloggt' });
    });
});

app.post('/api/register', async (req, res) => {
    const { name, email, passwort } = req.body;
    try {
        const userExists = await dbCon.getUserByEmail(email);
        if (userExists) {
            return res.status(400).json({ success: false, message: 'E-Mail bereits registriert' });
        }
        const hashedPassword = hashPassword(passwort);
        await dbCon.createUser(name, email, hashedPassword);

        res.json({ success: true, message: 'Registrierung erfolgreich' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Serverfehler bei der Registrierung' });
    }
});

// Simple hash function
function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}


// Server startup
app.listen(port, () => {
    console.log(`Listening on ${port}`)
})
