const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const morgan = require("morgan");

const connectDB = require("./config/db");

dotenv.config({ path: "./.env" });
const env = process.env.NODE_ENV || "development";
const PORT = process.env.PORT || 5000;

connectDB();
const app = express();

if (env === "development") {
  app.use(morgan("dev"));
}
app.use(cors());
app.use(express.json());

const v1Routes = require("./routes/v1");

app.use("/api/v1", v1Routes);
app.get("/", (req, res) => {
  res.send("Roadmate API is running...");
});
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    error: "Not found",
  });
});

app.listen(PORT, console.info(`Server running in ${env} mode on port ${PORT}`));

process.on("unhandledRejection", (err, promise) => {
  console.log(`Error: ${err.message}`);
  server.close(() => process.exit(1));
});
