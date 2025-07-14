// notificador.js (backend con Express y Firebase Admin)
const express = require("express");
const axios = require("axios");
const cors = require("cors");
const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

const app = express();
app.use(cors());
app.use(express.json());

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const CLIENT_ID = "8828438089593232"; // tu client_id
const CLIENT_SECRET = "7tI0QgvEKJVNopH1jXr4hbP7WJhwrxq5"; // tu client_secret
const REDIRECT_URI = "https://verificador-backend.onrender.com/auth/callback";

// CALLBACK DE MERCADO PAGO
app.get("/auth/callback", async (req, res) => {
  const code = req.query.code;
  if (!code) return res.status(400).send("Falta el código de autorización");

  try {
    const tokenResponse = await axios.post("https://api.mercadopago.com/oauth/token", {
      grant_type: "authorization_code",
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code: code,
      redirect_uri: REDIRECT_URI
    }, {
      headers: { "Content-Type": "application/json" }
    });

    const access_token = tokenResponse.data.access_token;

    // Obtener el email del usuario conectado
    const userResponse = await axios.get("https://api.mercadopago.com/v1/identity/userinfo", {
      headers: { Authorization: `Bearer ${access_token}` }
    });

    const email = userResponse.data.email;

    // Buscar al usuario en Firestore por email
    const snapshot = await db.collection("usuarios").where("email", "==", email).limit(1).get();

    if (!snapshot.empty) {
      const userDoc = snapshot.docs[0];
      await userDoc.ref.update({ token: access_token });
      return res.send("✅ Conexión exitosa con Mercado Pago. Ya podés cerrar esta ventana.");
    } else {
      return res.send("❌ No se encontró un usuario con ese email en Firestore.");
    }
  } catch (error) {
    console.error("Error en callback de Mercado Pago:", error);
    return res.status(500).send("Error al obtener el token de Mercado Pago");
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Servidor escuchando en puerto ${PORT}`);
});