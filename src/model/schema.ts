import mongoose from "mongoose";

const gameServerSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    region: {
        type: String,
        required: true
    },
    playlist: {
        type: String,
        required: true
    },
    playerCount: {
        type: Number,
        required: true
    },
    IP: {
        type: String,
        required: true
    },
    Port: {
        type: String,
        required: true
    },
    status: {
        type: String,
        required: true
    },
    version: {
        type: Number,
        required: false
    }
});

const model = mongoose.model('gameservers', gameServerSchema);

export default model;