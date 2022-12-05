const mongoose = require("mongoose");

module.exports = mongoose.model('User', new mongoose.Schema({
    discordID: {
        type: String,
        required: false,
        unique: false
    },
    steamID: {
        type: String,
        required: true,
        unique: true
    },
    IPAddress: {
        type: String,
        required: true,
        unique: false
    }
}));