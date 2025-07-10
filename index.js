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

// Neue API-Route zum Erstellen einer Bestellung aus dem Warenkorb
app.post('/api/bestellung/create', async (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ success: false, error: 'Nicht eingeloggt' });
    }

    try {
        const userId = req.session.userId;
        const result = await dbCon.createBestellungFromWarenkorb(userId);

        if (result.success) {
            res.json({ success: true, message: 'Bestellung erfolgreich erstellt' });
        } else {
            res.status(500).json({ success: false, error: 'Fehler beim Erstellen der Bestellung' });
        }
    } catch (error) {
        console.error('Fehler beim Erstellen der Bestellung:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Serverfehler beim Erstellen der Bestellung'
        });
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

// Verbesserte Middleware zum Schutz von Admin-Routen (API und statische Inhalte)
function adminAuthMiddleware(req, res, next) {
    if (!req.session.userId) {
        // Je nach Anfrageart unterschiedlich antworten
        if (req.xhr || req.path.startsWith('/api/')) {
            return res.status(401).json({ success: false, error: 'Nicht eingeloggt' });
        } else {
            return res.redirect('/index.html');
        }
    }

    dbCon.getUserById(req.session.userId)
        .then(user => {
            if (!user || user.IsAdmin !== 1) {
                if (req.xhr || req.path.startsWith('/api/')) {
                    return res.status(403).json({ success: false, error: 'Keine Admin-Berechtigung' });
                } else {
                    return res.redirect('/index.html');
                }
            }
            next();
        })
        .catch(error => {
            console.error('Fehler bei Admin-Authentifizierung:', error);
            if (req.xhr || req.path.startsWith('/api/')) {
                return res.status(500).json({ success: false, error: 'Serverfehler bei der Authentifizierung' });
            } else {
                res.redirect('/index.html');
            }
        });
}

// Anwendung der Middleware auf statische Admin-Routen
app.use('/admin', adminAuthMiddleware);

// Anwendung der Middleware auf alle Admin-API-Endpunkte
app.use('/api/admin', adminAuthMiddleware);

// Neuer API-Endpunkt zum Erstellen eines Menüs (nur für Admins)
app.post('/api/admin/menu/create', async (req, res) => {
    try {
        // Da die Middleware bereits die Admin-Berechtigung geprüft hat,
        // können wir diese redundanten Prüfungen entfernen:
        // if (!req.session.userId) { ... }
        // const user = await dbCon.getUserById(req.session.userId);
        // if (!user || user.IsAdmin !== 1) { ... }

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

// API-Route zum Aktualisieren eines Menüs (nur für Admins)
app.put('/api/admin/menu/:id', async (req, res) => {
    try {
        // Redundante Admin-Prüfungen entfernen, da die Middleware das bereits erledigt hat

        const menuId = req.params.id;

        // Überprüfen, ob das Menü existiert
        const menuExists = await dbCon.getMenuById(menuId);
        if (!menuExists || menuExists.length === 0) {
            return res.status(404).json({ success: false, error: 'Menü nicht gefunden' });
        }

        // Überprüfen, ob das Menü in der Vergangenheit liegt
        const menuDate = new Date(menuExists[0].Tag);
        menuDate.setHours(0, 0, 0, 0);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (menuDate < today) {
            return res.status(400).json({
                success: false,
                error: 'Menüs in der Vergangenheit können nicht bearbeitet werden'
            });
        }

        // Validierung der Eingabedaten
        const { name, beschreibung, preis, tag, allergene, hinweise } = req.body;

        if (!name || !beschreibung || !preis || !tag) {
            return res.status(400).json({ success: false, error: 'Bitte füllen Sie alle Pflichtfelder aus' });
        }

        // Erweiterte Datumsvalidierung für das neue Datum
        const newMenuDate = new Date(tag);
        if (isNaN(newMenuDate.getTime())) {
            return res.status(400).json({
                success: false,
                error: 'Ungültiges Datum'
            });
        }

        newMenuDate.setHours(0, 0, 0, 0);

        if (newMenuDate < today) {
            return res.status(400).json({
                success: false,
                error: 'Das Datum darf nicht in der Vergangenheit liegen'
            });
        }

        const oneYearFromNow = new Date();
        oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
        oneYearFromNow.setHours(0, 0, 0, 0);

        if (newMenuDate > oneYearFromNow) {
            return res.status(400).json({
                success: false,
                error: 'Das Datum darf nicht mehr als ein Jahr in der Zukunft liegen'
            });
        }

        // Menü in der Datenbank aktualisieren
        await dbCon.updateMenu(menuId, req.body);

        res.json({ success: true, message: 'Menü erfolgreich aktualisiert' });
    } catch (error) {
        console.error('Fehler beim Aktualisieren des Menüs:', error);
        res.status(500).json({ success: false, error: 'Serverfehler beim Aktualisieren des Menüs' });
    }
});

// API-Route zum Löschen eines Menüs (nur für Admins)
app.delete('/api/admin/menu/:id', async (req, res) => {
    try {
        // Redundante Admin-Prüfungen entfernen, da die Middleware das bereits erledigt hat

        const menuId = req.params.id;

        // Überprüfen, ob das Menü existiert
        const menuExists = await dbCon.getMenuById(menuId);
        if (!menuExists || menuExists.length === 0) {
            return res.status(404).json({ success: false, error: 'Menü nicht gefunden' });
        }

        // Überprüfen, ob das Menü in der Vergangenheit liegt
        const menuDate = new Date(menuExists[0].Tag);
        menuDate.setHours(0, 0, 0, 0);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (menuDate < today) {
            return res.status(400).json({
                success: false,
                error: 'Menüs in der Vergangenheit können nicht gelöscht werden'
            });
        }

        // Menü aus der Datenbank löschen
        await dbCon.deleteMenu(menuId);

        res.json({ success: true, message: 'Menü erfolgreich gelöscht' });
    } catch (error) {
        console.error('Fehler beim Löschen des Menüs:', error);
        const errorMessage = error.message || 'Serverfehler beim Löschen des Menüs';
        res.status(500).json({ success: false, error: errorMessage });
    }
});

// API-Route zum Abrufen aktiver Bestellungen (für Admins)
app.get('/api/admin/orders/active', async (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ success: false, error: 'Nicht eingeloggt' });
    }

    try {
        // Prüfen, ob der Benutzer Admin ist
        const user = await dbCon.getUserById(req.session.userId);
        if (!user || user.IsAdmin !== 1) {
            return res.status(403).json({ success: false, error: 'Keine Admin-Berechtigung' });
        }

        // Aktive Bestellungen aus der Datenbank abrufen
        const orders = await dbCon.getActiveOrders();
        res.json(orders);
    } catch (error) {
        console.error('Fehler beim Abrufen aktiver Bestellungen:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Serverfehler beim Abrufen aktiver Bestellungen'
        });
    }
});

// API-Route zum Abrufen abgeschlossener Bestellungen (für Admins)
app.get('/api/admin/orders/completed', async (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ success: false, error: 'Nicht eingeloggt' });
    }

    try {
        // Prüfen, ob der Benutzer Admin ist
        const user = await dbCon.getUserById(req.session.userId);
        if (!user || user.IsAdmin !== 1) {
            return res.status(403).json({ success: false, error: 'Keine Admin-Berechtigung' });
        }

        // Abgeschlossene Bestellungen aus der Datenbank abrufen
        const orders = await dbCon.getCompletedOrders();
        res.json(orders);
    } catch (error) {
        console.error('Fehler beim Abrufen abgeschlossener Bestellungen:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Serverfehler beim Abrufen abgeschlossener Bestellungen'
        });
    }
});

// API-Route zum Markieren einer Bestellung als abgeholt (für Admins)
app.post('/api/admin/orders/:id/complete', async (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ success: false, error: 'Nicht eingeloggt' });
    }

    try {
        // Prüfen, ob der Benutzer Admin ist
        const user = await dbCon.getUserById(req.session.userId);
        if (!user || user.IsAdmin !== 1) {
            return res.status(403).json({ success: false, error: 'Keine Admin-Berechtigung' });
        }

        const orderId = req.params.id;

        // Bestellung als abgeholt markieren
        const result = await dbCon.markOrderAsCompleted(orderId);

        if (result.success) {
            res.json({ success: true, message: 'Bestellung erfolgreich als abgeholt markiert' });
        } else {
            res.status(404).json({ success: false, error: 'Bestellung nicht gefunden' });
        }
    } catch (error) {
        console.error('Fehler beim Markieren der Bestellung als abgeholt:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Serverfehler beim Aktualisieren der Bestellung'
        });
    }
});

// API-Route zum Markieren einer Bestellung als bezahlt (für Admins)
app.post('/api/admin/orders/:id/pay', async (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ success: false, error: 'Nicht eingeloggt' });
    }

    try {
        // Prüfen, ob der Benutzer Admin ist
        const user = await dbCon.getUserById(req.session.userId);
        if (!user || user.IsAdmin !== 1) {
            return res.status(403).json({ success: false, error: 'Keine Admin-Berechtigung' });
        }

        const orderId = req.params.id;

        // Bestellung als bezahlt markieren
        const result = await dbCon.markOrderAsPaid(orderId);

        if (result.success) {
            res.json({ success: true, message: 'Bestellung erfolgreich als bezahlt markiert' });
        } else {
            res.status(404).json({ success: false, error: 'Bestellung nicht gefunden' });
        }
    } catch (error) {
        console.error('Fehler beim Markieren der Bestellung als bezahlt:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Serverfehler beim Aktualisieren der Bestellung'
        });
    }
});

// API-Route zum Abrufen aktiver (nicht abgeholter) Bestellungen eines Benutzers
app.get('/api/bestellungen/aktiv', async (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ success: false, message: 'Nicht eingeloggt' });
    }
    try {
        const userId = req.session.userId;
        const result = await dbCon.getAktiveBestellungenByUser(userId);
        res.json(result);
    } catch (error) {
        console.error('Fehler beim Abrufen der aktiven Bestellungen:', error);
        res.status(500).json({
            success: false,
            message: 'Serverfehler beim Abrufen der aktiven Bestellungen'
        });
    }
});

// API-Route zum Abrufen abgeschlossener (abgeholter) Bestellungen eines Benutzers
app.get('/api/bestellungen/abgeschlossen', async (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ success: false, message: 'Nicht eingeloggt' });
    }

    try {
        const userId = req.session.userId;
        const result = await dbCon.getAbgeschlosseneBestellungenByUser(userId);
        res.json(result);
    } catch (error) {
        console.error('Fehler beim Abrufen der abgeschlossenen Bestellungen:', error);
        res.status(500).json({
            success: false,
            message: 'Serverfehler beim Abrufen der abgeschlossenen Bestellungen'
        });
    }
});

// Bestehende Route für alle Bestellungen beibehalten (für Kompatibilität)
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

// API-Route zum Abrufen aller Admin-Benutzer
app.get('/api/admin/users', async (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ success: false, error: 'Nicht eingeloggt' });
    }

    try {
        // Prüfen, ob der Benutzer Admin ist
        const user = await dbCon.getUserById(req.session.userId);
        if (!user || user.IsAdmin !== 1) {
            return res.status(403).json({ success: false, error: 'Keine Admin-Berechtigung' });
        }

        // Admin-Benutzer aus der Datenbank abrufen
        const adminUsers = await dbCon.getAdminUsers();
        res.json(adminUsers);
    } catch (error) {
        console.error('Fehler beim Abrufen der Admin-Benutzer:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Serverfehler beim Abrufen der Admin-Benutzer'
        });
    }
});

// API-Route zum Erstellen eines neuen Admin-Benutzers
app.post('/api/admin/users', async (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ success: false, error: 'Nicht eingeloggt' });
    }

    try {
        // Prüfen, ob der Benutzer Admin ist
        const user = await dbCon.getUserById(req.session.userId);
        if (!user || user.IsAdmin !== 1) {
            return res.status(403).json({ success: false, error: 'Keine Admin-Berechtigung' });
        }

        const { name, email, password } = req.body;

        // Validierung der Eingaben
        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Bitte geben Sie Namen, E-Mail und Passwort an'
            });
        }

        // E-Mail-Format prüfen
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                error: 'Bitte geben Sie eine gültige E-Mail-Adresse ein'
            });
        }

        // Passwort hashen
        const hashedPassword = hashPassword(password);

        // Neuen Admin-Benutzer erstellen
        await dbCon.createAdminUser(name, email, hashedPassword);

        res.json({ success: true, message: 'Admin-Benutzer erfolgreich erstellt' });
    } catch (error) {
        console.error('Fehler beim Erstellen des Admin-Benutzers:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Serverfehler beim Erstellen des Admin-Benutzers'
        });
    }
});

// API-Route zum Ändern des eigenen Passworts
app.post('/api/user/change-password', async (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ success: false, message: 'Nicht eingeloggt' });
    }

    try {
        const { currentPassword, newPassword } = req.body;

        // Validierung der Eingaben
        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Bitte geben Sie das aktuelle und das neue Passwort an'
            });
        }

        // Passwort-Richtlinien prüfen
        const hasMinLength = newPassword.length >= 8;
        const hasUpperCase = /[A-Z]/.test(newPassword);
        const hasLowerCase = /[a-z]/.test(newPassword);
        const hasNumbers = /[0-9]/.test(newPassword);

        if (!hasMinLength || !hasUpperCase || !hasLowerCase || !hasNumbers) {
            return res.status(400).json({
                success: false,
                message: 'Das neue Passwort erfüllt nicht die Sicherheitsanforderungen'
            });
        }

        // Benutzer aus der Datenbank abrufen
        const user = await dbCon.getUserById(req.session.userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'Benutzer nicht gefunden' });
        }

        // Aktuelles Passwort überprüfen
        const hashedCurrentPassword = hashPassword(currentPassword);
        if (user.Passwort !== hashedCurrentPassword) {
            return res.status(401).json({ success: false, message: 'Aktuelles Passwort ist falsch' });
        }

        // Neues Passwort hashen und speichern
        const hashedNewPassword = hashPassword(newPassword);
        await dbCon.updateUserPassword(req.session.userId, hashedNewPassword);

        res.json({ success: true, message: 'Passwort erfolgreich geändert' });
    } catch (error) {
        console.error('Fehler beim Ändern des Passworts:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Serverfehler beim Ändern des Passworts'
        });
    }
});

// API-Route zum Abrufen aller normalen Benutzer (keine Admins)
app.get('/api/admin/regular-users', async (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ success: false, error: 'Nicht eingeloggt' });
    }

    try {
        // Prüfen, ob der Benutzer Admin ist
        const user = await dbCon.getUserById(req.session.userId);
        if (!user || user.IsAdmin !== 1) {
            return res.status(403).json({ success: false, error: 'Keine Admin-Berechtigung' });
        }

        // Alle Benutzer (ohne Admins) aus der Datenbank abrufen
        const regularUsers = await dbCon.getRegularUsers();
        res.json(regularUsers);
    } catch (error) {
        console.error('Fehler beim Abrufen der Benutzer:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Serverfehler beim Abrufen der Benutzer'
        });
    }
});
