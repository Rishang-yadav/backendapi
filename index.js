const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
const cors = require('cors'); 
const moment = require('moment-timezone'); 

const app = express();

app.use(cors()); 
require("dotenv").config();

mongoose.connect(process.env.DATABASE_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

const db = mongoose.connection;

const blockSchema = new mongoose.Schema({
    height: Number,
    timestamp: Date
});

const Block = mongoose.model('Block', blockSchema);

async function fetchDataAndSave() {
    try {
        const heightdata = await Block.find();
        console.log("Height Data: ", heightdata);
        
        if (heightdata.length > 0) {
            const response = await axios.get('https://mempool.space/api/blocks/tip/height');
            const latestHeight = response.data;
            let checking = false;
            for (let i = 0; i < heightdata.length; i++) {
                if (heightdata[i].height === latestHeight) {
                    checking = true;
                }
            }

            if (!checking) {
                const blockData = {
                    height: latestHeight,
                    timestamp: new Date()
                };
                const block = new Block(blockData);
                await block.save();
                console.log('New block data saved:', blockData);
            } else {
                console.log('Data already up to date.');
            }
        } else {
            const response = await axios.get('https://mempool.space/api/blocks/tip/height');
            const blockData = {
                height: response.data,
                timestamp: new Date()
            };  
            const block = new Block(blockData);
            await block.save();
            console.log('First block data saved:', blockData);
        }
    } catch (error) {
        console.error('Error fetching data:', error);
    }
}

async function fetchAndSaveInLoop() {
    while (true) {
        await fetchDataAndSave();
        await new Promise(resolve => setTimeout(resolve, 30000));
    }
}

fetchAndSaveInLoop();

app.get('/blocks', async (req, res) => {
    try {
        const blocks = await Block.find();
        const blocksIST = blocks.map(block => {
            return {
                height: block.height,
                timestamp: moment(block.timestamp).tz("Asia/Kolkata").format("YYYY-MM-DD HH:mm:ss")
            }
        });
        res.json(blocksIST);
    } catch (error) {
        console.error('Error fetching block data:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', function () {
    console.log('Connected to MongoDB');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
