import express from "express"
import "dotenv/config"
import cors from "cors"
import cookieParser from "cookie-parser"

const app = express()

//cors setup
const allowedOrigins = process.env.ORIGINS.split(",")
app.use(cors({origin:allowedOrigins, credentials: true}))

//middlewares
app.use(cookieParser())
app.use(express.json({limit: "100mb"}))

//api routes
app.get("/", (req,res)=>res.send("Server is running.."))
const PORT = process.env.PORT || 3000;

//error handling middleware
app.use((err, _req,res,_next)=>{
  res.status(err.status || 500).json({error: err.message})|| "something went wronf";
  })

app.listen(PORT, ()=>{console.log(`server running on port ${PORT}`)})