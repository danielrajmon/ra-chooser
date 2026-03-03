import cors from "cors";
import { config } from "dotenv";
import express from "express";
import path from "path";
import bulkRoutes from "./routes/bulk";
import fileRoutes from "./routes/files";
import platformRoutes from "./routes/platforms";

config({ path: path.join(__dirname, "../.env"), quiet: true });

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api", platformRoutes);
app.use("/api", fileRoutes);
app.use("/api/bulk", bulkRoutes);

const port = parseInt(process.env.BACKEND_PORT || "4000", 10);
app.listen(port, () => {
  console.log(`Backend running on http://localhost:${port}`);
});
