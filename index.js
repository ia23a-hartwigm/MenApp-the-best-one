const express = require('express');
const bodyParser = require('body-parser');
const dbCon = require('./dbCon.js');
const crypto = require('crypto');
const app = express();
const port = process.env.SERVER_PORT;

app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use(express.static(__dirname + "/public"));


app.get('/api/menu/id/:id', async (req, res) => {
    try {
        const menu = await dbCon.getMenuByDay(req.params.id);
        res.json(menu);
    } catch (error) {
        res.status(500).json({success: false, error: 'Fehler beim Abrufen des Tagesmenüs'});
    }
});

app.get('/api/test', async (req, res) => {
    try {
        res.json('Test from the Server')
    } catch (error) {
        console.error(error);
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
        res.status(500).json({success: false, error: 'Fehler beim Abrufen des Wochenmenüs'});
    }
});

// API to add a new menu item to the warenkorb of the logged-in user
app.post('/api/kart/add', async (req, res) => {
    console.log('Received request to add item to cart:', req.body);
    try {
        const {userId, menuItemId, menge} = req.body;
        if (!userId || !menuItemId || !menge) {
            return res.status(400).json({success: false, error: 'Bitte geben Sie userId, menuItemId und menge an'});
        }

        // Assuming you have a function in dbCon to add an item to the cart
        const result = await dbCon.addToCart(userId, menuItemId, menge);
        if (result.success) {
            res.json({success: true, message: 'Artikel erfolgreich zum Warenkorb hinzugefügt'});
        } else {
            res.status(500).json({success: false, error: 'Fehler beim Hinzufügen des Artikels zum Warenkorb'});
        }

    } catch (error) {
        console.error('Error adding item to cart:', error);
        res.status(500).json({success: false, error: 'Fehler beim Hinzufügen des Artikels zum Warenkorb'});
    }
});

// API zum vollständigen Entfernen eines Elements aus dem Warenkorb
app.post('/api/kart/remove', async (req, res) => {
    console.log('Received request to remove item from cart:', req.body);
    try {
        const {userId, warenKorbId} = req.body;
        if (!userId || !warenKorbId) {
            return res.status(400).json({success: false, error: 'Bitte geben Sie userId und warenKorbId an'});
        }

        const result = await dbCon.removeFromCart(userId, warenKorbId);
        if (result.success) {
            res.json({success: true, message: 'Artikel erfolgreich aus dem Warenkorb entfernt'});
        } else {
            res.status(404).json({success: false, error: result.error || 'Fehler beim Entfernen des Artikels'});
        }
    } catch (error) {
        console.error('Error removing item from cart:', error);
        res.status(500).json({success: false, error: 'Serverfehler beim Entfernen des Artikels'});
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
