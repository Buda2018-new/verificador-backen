const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());


const REDIRECT_URI = "https://verificador-backend.onrender.com/auth/callback"; // Asegurate de que coincida con el de la app en MP

const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();



app.get("/auth/callback", async (req, res) => {
  const code = req.query.code;

  if (!code) {
    return res.status(400).send("❌ No se recibió código de autorización.");
  }

  try {
    // Paso 1: Intercambiar el code por el access_token
const response = await axios.post("https://api.mercadopago.com/oauth/token", {
  grant_type: "authorization_code",
  client_id: "4408114506102237", // tu client ID real
  client_secret: "mVNOdqqQan8aaMpJF4yhlkh1J562VcHh", // tu client secret real
  code: code,
  redirect_uri: "https://verificador-backend.onrender.com/auth/callback"
}, {
  headers: {
    "Content-Type": "application/json"
  }
});

    const { access_token, refresh_token, public_key, user_id } = response.data;

    // 🔐 Guardalo en Firestore (opcional) o mostralo
    console.log("🔐 Token recibido:", access_token);

    res.send("✅ ¡Conectado con Mercado Pago! Ya podés cerrar esta ventana.");
    
    // Opcional: redirigir a Firebase Hosting (dashboard)
    // res.redirect("https://pagoseguroapp-da071.web.app");

  } catch (error) {
    console.error("❌ Error al intercambiar el código:", error.response?.data || error.message);
    res.status(500).send("❌ Ocurrió un error al conectar con Mercado Pago.");
  }
});

const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
});
