const config = require('../../config.json');
const mongoose = require('mongoose');

async function connect() {
    const conn = await mongoose.connect(config.MONGOSTRING, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        useCreateIndex: true,
        useFindAndModify: false
    })
    .then(() => ({ error: false }))
    .catch((reason) => ({ error: true, reason }));

    return conn;
}

module.exports = {
    async attemptConnection() {
        const results = await connect();

        if (results.error) {
            console.error(`There was an error while connecting to the mongodb database. Check your string and verify your credentials and information is correct!\n\n${results.reason}`);
            return false;
        } else {
            console.info(`Connection successfully established to mongodb!`);
            return true;
        }
    }
}