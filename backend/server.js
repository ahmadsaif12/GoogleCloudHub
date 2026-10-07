import express from "express"
import "dotenv/config"
import cors from "cors"
import cookieParser from "cookie-parser"
import { initDB } from "./config/db.js"
import authRouter from "./routes/authRoutes.js"
import folderRouter from "./routes/folderRoutes.js"
import fileRouter from "./routes/fileRoutes.js"
import trashRouter from "./routes/trashRoutes.js"
import shareRouter from "./routes/shareRoutes.js"

const app = express()

//cors setup
const allowedOrigins = process.env.ORIGINS.split(",")
app.use(cors({ origin: allowedOrigins, credentials: true }))

//middlewares
app.use(cookieParser())
app.use(express.json({ limit: "100mb" }))

//api routes
app.get("/", (req, res) => res.send("Server is running.."))
app.use("/api/auth", authRouter)
app.use("/api/folders", folderRouter)
app.use("/api/files", fileRouter)
app.use("/api/trash", trashRouter)
app.use("/api/shares", shareRouter)

const PORT = process.env.PORT || 3000

//404 handler
app.use((_req, res) => res.status(404).json({ message: "Route not found" }))

//error handling middleware
app.use((err, _req, res, _next) => {
  const status = err.status || 500
  if (status >= 500) console.error(err)
  const message = status >= 500 ? "Internal server error" : err.message
  res.status(status).json({ message, error: message })
})

//initialize db and start the server
initDB()
  .then(() => {
    app.listen(PORT, () => console.log(`Server is running on port ${PORT}`))
  })
  .catch((err) => {
    console.error("Failed to initialize the database:", err)
    process.exit(1)
  })