// app.js
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const app = express();

// --- CORS ---
// Permite tu frontend en Vercel y requests sin origin (Postman, server)
const allowedOrigins = [
  process.env.FRONTEND_URL || "https://tu-frontend.vercel.app",
  "http://localhost:3000"
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // permitir herramientas sin origin
    if (allowedOrigins.indexOf(origin) === -1) {
      return callback(new Error("CORS: origen no permitido"), false);
    }
    return callback(null, true);
  },
  credentials: true
}));

app.use(express.json());

// --- Conexión MONGO (reutiliza la conexión si ya existe) ---
const mongoUri = process.env.MONGODB_URI;
async function connectMongo() {
  if (!mongoUri) {
    console.warn("MONGODB_URI no está definida en las vars de entorno");
    return;
  }
  if (mongoose.connection.readyState === 1) {
    // ya conectado
    return;
  }
  await mongoose.connect(mongoUri, {
    // opciones si las necesitas
  });
  console.log("Conectado a MongoDB");
}
// Conectar inmediatamente (Vercel ejecutará este archivo por cada cold start)
connectMongo().catch(err => console.error("Error conectando a Mongo:", err));

// --- RUTAS ---
// Asegúrate de que los require/imports apunten correctamente a tus archivos de rutas.
// Ejemplo:
import authRoutes from "./routes/auth.js";
import productosRoutes from "./routes/productos.js";
import cartRoutes from "./routes/cart.js";

app.use("/api/auth", authRoutes);
app.use("/api/productos", productosRoutes);
app.use("/api/cart", cartRoutes);

// Ruta de prueba
app.get("/api/health", (req, res) => res.json({ ok: true, env: process.env.NODE_ENV || "dev" }));

// IMPORTANT: en Vercel exporta el app como default (no uses app.listen)
export default app;
