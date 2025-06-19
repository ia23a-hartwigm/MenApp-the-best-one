const express = require('express');
const bodyParser = require('body-parser');
const dbCon = require('./dbCon.js');
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
// Server startup

app.listen(port, () => {
    console.log(`Listening on ${port}`)
})
