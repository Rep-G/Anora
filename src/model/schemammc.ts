import mongoose from "mongoose";

const mmcSchema = new mongoose.Schema({
    created: {
        type: Date,
        required: false
    },
    code: {
        type: String,
        required: false
    },
    code_lower: {
        type: String,
        required: false
    },
    ip: {
        type: String,
        required: false
    },
    port: {
        type: Number,
        required: false
    },
    
});

const model = mongoose.model('mmcodes', mmcSchema);

export default model;