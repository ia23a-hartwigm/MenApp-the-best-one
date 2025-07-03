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



app.get('/api/admin/menu', async (req, res) => {
    try {
        // startDate is date.now but in javascript format
        let startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
        if (!startDate) {
            const today = new Date();
            startDate = today.toISOString().split('T')[0]; // YYYY-MM-DD
        }
        const menu = await dbCon.getMenu(startDate);
        res.json(menu);
    } catch (error) {
        res.status(500).json({success: false, error: 'Fehler beim Abrufen des Wochenmenüs'});
    }
});


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

app.get('/api/warenkorb', async (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ success: false, message: 'Nicht eingeloggt' });
    }

    try {
        const userId = req.session.userId;
        const result = await dbCon.getWarenkorbByUser(userId);
        res.json(result); // Array von { gerichtName, menge }
    } catch (error) {
        console.error('Fehler beim Abrufen des Warenkorbs:', error);
        res.status(500).json({ success: false, message: 'Serverfehler beim Abrufen des Warenkorbs' });
    }
});

app.get('/api/bestellungen', async (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ success: false, message: 'Nicht eingeloggt' });
    }

    try {
        const userId = req.session.userId;
        const result = await dbCon.getBestellungByUser(userId);
        res.json(result); // Array von { gerichtName, menge }
    } catch (error) {
        console.error('Fehler beim Abrufen des Warenkorbs:', error);
        res.status(500).json({ success: false, message: 'Serverfehler beim Abrufen des Warenkorbs' });
    }
});

// API-Route um zu prüfen, ob der eingeloggte Benutzer ein Admin ist
app.get('/api/user/isAdmin', async (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ success: false, message: 'Nicht eingeloggt' });
    }

    try {
        const user = await dbCon.getUserById(req.session.userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'Benutzer nicht gefunden' });
        }

        res.json({ success: true, isAdmin: user.IsAdmin === 1 });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Serverfehler beim Prüfen der Admin-Rechte' });
    }
});

// Middleware zum Schutz von Admin-Routen
function adminAuthMiddleware(req, res, next) {
    if (!req.session.userId) {
        return res.redirect('/index.html');
    }

    dbCon.getUserById(req.session.userId)
        .then(user => {
            if (!user || !user.IsAdmin) {
                return res.redirect('/index.html');
            }
            next();
        })
        .catch(error => {
            console.error('Fehler bei Admin-Authentifizierung:', error);
            res.redirect('/index.html');
        });
}

// Anwendung der Middleware auf Admin-Routen
app.use('/admin', adminAuthMiddleware);

// Neuer API-Endpunkt zum Erstellen eines Menüs (nur für Admins)
app.post('/api/admin/menu/create', async (req, res) => {
    // Prüfen, ob der Benutzer eingeloggt und Admin ist
    if (!req.session.userId) {
        return res.status(401).json({ success: false, error: 'Nicht eingeloggt' });
    }

    try {
        const user = await dbCon.getUserById(req.session.userId);
        if (!user || user.IsAdmin !== 1) {
            return res.status(403).json({ success: false, error: 'Keine Admin-Berechtigung' });
        }

        // Validierung der Eingabedaten
        const { name, beschreibung, preis, tag, allergene, hinweise } = req.body;

        if (!name || !beschreibung || !preis || !tag) {
            return res.status(400).json({ success: false, error: 'Bitte füllen Sie alle Pflichtfelder aus' });
        }

        // Erweiterte Datumsvalidierung
        // 1. Überprüfung, ob das Datum gültig ist
        const menuDate = new Date(tag);
        if (isNaN(menuDate.getTime())) {
            return res.status(400).json({
                success: false,
                error: 'Ungültiges Datum'
            });
        }

        // 2. Uhrzeit auf Mitternacht setzen für Vergleiche
        menuDate.setHours(0, 0, 0, 0);

        // 3. Datum darf nicht in der Vergangenheit liegen
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (menuDate < today) {
            return res.status(400).json({
                success: false,
                error: 'Das Datum darf nicht in der Vergangenheit liegen'
            });
        }

        // 4. Datum darf nicht zu weit in der Zukunft liegen (z.B. maximal 1 Jahr)
        const oneYearFromNow = new Date();
        oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
        oneYearFromNow.setHours(0, 0, 0, 0);

        if (menuDate > oneYearFromNow) {
            return res.status(400).json({
                success: false,
                error: 'Das Datum darf nicht mehr als ein Jahr in der Zukunft liegen'
            });
        }

        // 5. Optional: Prüfen ob das Datum ein Wochentag ist (falls keine Wochenendmenüs)
        // const dayOfWeek = menuDate.getDay(); // 0 = Sonntag, 6 = Samstag
        // if (dayOfWeek === 0 || dayOfWeek === 6) {
        //     return res.status(400).json({
        //         success: false,
        //         error: 'An Wochenenden werden keine Menüs angeboten'
        //     });
        // }

        // Neues Menü in der Datenbank erstellen
        await dbCon.createMenu(req.body);

        res.json({ success: true, message: 'Menü erfolgreich erstellt' });
    } catch (error) {
        console.error('Fehler beim Erstellen des Menüs:', error);
        res.status(500).json({ success: false, error: 'Serverfehler beim Erstellen des Menüs' });
    }
});

