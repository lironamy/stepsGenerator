const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const cors = require("cors");

const app = express(); // Define the app before using it

const port = 3000;

// Allow Cross-Origin requests
app.use(cors());

// Connect to MongoDB
mongoose.connect(
    "mongodb+srv://lironamy:Ladygaga2@cluster0.sn5e7l9.mongodb.net/stepgeneretor?retryWrites=true&w=majority",
    { useNewUrlParser: true, useUnifiedTopology: true }
);

// On Connection
mongoose.connection.on("connected", () => {
    console.log("Connected to database");
});

// Define a schema for storing answers
const answerSchema = new mongoose.Schema({
    question: String,
    id: Number,
    type: String,
    answers: Array,  // For multiple-choice answers
    answer_id: mongoose.Schema.Types.Mixed  // Can be a Number or Array
});

// Create a model based on the schema
const Answer = mongoose.model('Answer', answerSchema);

// Middleware to parse incoming JSON data
app.use(bodyParser.json());

// Define the setanswers POST route to store answers in MongoDB
app.post('/setanswers', async (req, res) => {
    const answers = req.body;

    if (!answers || !Array.isArray(answers)) {
        return res.status(400).json({ message: 'Invalid data format' });
    }

    try {
        for (const answer of answers) {
            if (answer.type === 'single' && Array.isArray(answer.answer_id)) {
                answer.answer_id = answer.answer_id.map(Number);  // Ensure the array contains numbers
            }
            const newAnswer = new Answer(answer);
            await newAnswer.save();
        }

        res.status(200).json({ message: 'Answers received and saved successfully', data: answers });
    } catch (error) {
        console.error('Error saving answers:', error);
        res.status(500).json({ message: 'Error saving answers', error });
    }
});

// Define the setanswers GET route to retrieve stored answers from MongoDB
app.get('/setanswers', async (req, res) => {
    try {
        // Retrieve all stored answers from MongoDB
        const storedAnswers = await Answer.find();
        res.status(200).json({ message: 'Answers retrieved successfully', data: storedAnswers });
    } catch (error) {
        console.error('Error retrieving answers:', error);
        res.status(500).json({ message: 'Error retrieving answers', error });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
