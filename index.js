const express = require('express');
const bodyParser = require('body-parser');
const dbCon = require('./dbCon.js');
const app = express();
const port = 3000;

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

// Server startup

app.listen(port, () => {
    console.log(`Listening on ${port}`)
})
