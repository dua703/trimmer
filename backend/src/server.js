const dns = require("node:dns");
const path = require("node:path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

try {
  dns.setServers(["8.8.8.8", "1.1.1.1", "8.8.4.4"]);
} catch {
  // Keep OS default DNS servers if overriding is not permitted.
}

const mongoose = require("mongoose");
const app = require("./app");
const { env } = require("./config/env");

async function start() {
  await mongoose.connect(env.MONGODB_URI);
  const server = app.listen(env.PORT, () => {
    console.log(`Authentication API listening on port ${env.PORT}`);
  });

  const shutdown = async () => {
    server.close(async () => {
      await mongoose.disconnect();
      process.exit(0);
    });
  };

  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}

start().catch((error) => {
  console.error("Failed to start authentication API:", error);
  process.exitCode = 1;
});
