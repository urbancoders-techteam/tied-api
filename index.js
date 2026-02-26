const express = require("express");
const mongoose = require("mongoose");
require("dotenv").config();
const app = express();
const cors = require("cors");
const morgan = require("morgan");
const router = require("./router.js");
const port = 8000;

const httpServer = require("http").createServer(app);

// ✅ Connect DB
async function connectDB() {
  await mongoose.connect(process.env.DB_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  console.log("Mongo Connected");
}

// ✅ Middleware (correct order and usage)
app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ extended: true, limit: "100mb" }));

app.use(
  cors({
    origin: "*",
    credentials: true,
  })
);

app.use(morgan("dev"));

// ✅ Routes
app.use("/api/v1", router);

// ✅ Start server
httpServer.listen(port, async () => {
  try {
    await connectDB();
    console.log(`Server listening on Port ==> http://localhost:${port}`);
  } catch (err) {
    console.log(`Connection error ===> ${err}`);
  }
});
