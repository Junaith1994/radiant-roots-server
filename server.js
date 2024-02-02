const express = require('express');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const app = express();
const port = process.env.PORT || 5000;

// Middle-wires
app.use(cors());
app.use(express.json());

// Generating Access Token
const generateAccessToken = userEmail => {
    return jwt.sign({ userEmail }, process.env.SECRET_TOKEN, { expiresIn: '1d' });
}

// Sending access token to the requested url
app.post('/createNewUser', async (req, res) => {
    const userEmail = await req.body.email;
    const token = generateAccessToken(userEmail);
    res.send(token);
})

// Verify JWT token from client side
function verifyJwtToken(req, res, next) {
    const authHeader = req.headers;
    const token = authHeader && authHeader?.authorization?.split(' ')[1];

    if (!token) {
        return res.status(401).send({ title: "Unauthorized Access" })
    }

    jwt.verify(token, process.env.SECRET_TOKEN, (err, user) => {
        if (err) {
            return res.status(403).send({ title: "Forbidden Access" })
        }
        req.user = user;
        next()
    })
}

// MongoDb connection string
const uri = `mongodb+srv://${process.env.DATABASE_USER}:${process.env.DATABASE_PASS}@cluster0.4ostg1n.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

// Connecting to client to the server
const clientConnect = async () => {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
}
clientConnect();

async function run() {
    try {
        // Database collections
        const activitiesCollection = client.db("Radiant-Roots").collection("Activities");
        const volunteersCollection = client.db("Radiant-Roots").collection("Volunteers");


        // All activities loading api
        app.get('/activities', async (req, res) => {
            const cursor = activitiesCollection.find();
            const activities = await cursor.toArray();
            res.send(activities);
        });

        // Registered Volunteers info loading api 
        app.get('/registered-activities/:email', verifyJwtToken, async (req, res) => {
            const volunteerEmail = req.params.email;
            const verifiedJWTEmail = req.user.userEmail;
            
            if (volunteerEmail === verifiedJWTEmail) {
                const query = { email: volunteerEmail };
                const cursor = volunteersCollection.find(query);
                const volunteersInfo = await cursor.toArray();
                res.send(volunteersInfo);
            }
            else {
                res.status(403).send("Forbidden Access")
            }

        })

        // Post api - Creating Data and adding to the database
        app.post('/add-activities', async (req, res) => {
            const newActivity = req.body;
            const result = await activitiesCollection.insertOne(newActivity);
            res.send(result);
        })

        // Post api - Creaing volunteer info to database volunteer collection
        app.post('/volunteer-registration', async (req, res) => {
            const newVolunteer = req.body;
            const result = await volunteersCollection.insertOne(newVolunteer);
            res.send(result);
        })

        // Delete volunteer info api from 'volunteers' data
        app.delete('/remove-volunteer/:id', async (req, res) => {
            const volunteerId = req.params.id;
            const query = { _id: new ObjectId(volunteerId) };
            const result = await volunteersCollection.deleteOne(query);
            res.send(result);
        })

        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        await client.close();
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send("Radiant Roots Server is Running")
})

app.listen(port, () => {
    console.log("Listening to port:", port);
})

// Exporting the Express API
module.exports = app;