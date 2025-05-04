import mongoose from "mongoose";

const playersSchema = new mongoose.Schema({
    sessionId: {
        type: String,
        required: false
    },
    uniqueId: {
        type: String,
        required: false
    },
    ip: {
        type: String,
        required: false
    },
    port: {
        type: String,
        required: false
    },
});

const model = mongoose.model('players', playersSchema);

export default model;