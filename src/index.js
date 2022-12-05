const config = require("../config.json");
const MongoHandler = require("./custom/MongoHandler");
const ExpressHandler = require("./custom/ExpressHandler");
const fs = require("fs");
const server = config.HTTPS ? require("https") : require("http");
const DJSBot = require("./DiscordBot");

async function initialize() {
  // Attempt to connect to mongodb.
  const attemptConnection = await MongoHandler.attemptConnection();

  if (!attemptConnection) return;

  DJSBot.initialize();

  const expApp = ExpressHandler.initalize();

  const srv = server
    .createServer(
      config.HTTPS
        ? {
            key: fs.readFileSync(config.PRIVKEY_PATH),
            cert: fs.readFileSync(config.CERT_PATH),
            ca: fs.readFileSync(config.FULLCHAIN_PATH),
          }
        : {},
      expApp
    )
    .listen(config.PORT);
  
  srv.on('error', (err) => {
    if (err.message.code == 'ETIMEDOUT') console.log("There was an issue with the server!")
  })

  console.log(
    `The API is now listening on - ${config.API_DOMAIN}:${config.PORT}${config.API_ROUTE}`
  );
}

// Start the service!
initialize();

