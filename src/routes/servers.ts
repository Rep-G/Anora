import express from 'express';
import GameServer from '../model/schema.js';

const app = express.Router();

app.get('/servers', async (req, res) => {
    try {
        const servers = await GameServer.find();
        const response = servers.map(server => ({
            status: server.status,
            playlist: server.playlist,
            version: server.version || "N/A", 
            players: `${server.playerCount}`
        }));

        res.json(response);
    } catch (error) {
        console.error('Error fetching servers:', error);
        res.status(500).json({ error: 'Failed to fetch game servers' });
    }
});

export default app;
