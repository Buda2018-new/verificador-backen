const express = require("express");
const axios = require("axios");
const cors = require("cors");
const admin = require("firebase-admin");

const serviceAccount = JSON.parse(process.env.SERVICE_ACCOUNT);

const app = express();
app.use(cors());
app.use(express.json());

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const CLIENT_ID = "8828438089593232";
const CLIENT_SECRET = "7tI0QgvEKJVNopH1jXr4hbP7WJhwrxq5";
const REDIRECT_URI = "https://verificador-backend.onrender.com/auth/callback";

// 🚀 CALLBACK de Mercado Pago OAuth
app.get("/auth/callback", async (req, res) => {
  const code = req.query.code;
  if (!code) {
    console.warn("⚠️ Falta parámetro 'code' en el callback");
    return res.status(400).send("Falta el código de autorización.");
  }

  console.log("📥 Código recibido:", code);

  try {
    // 🔐 Solicitar access_token
    const { data: tokenData } = await axios.post("https://api.mercadopago.com/oauth/token", {
      grant_type: "authorization_code",
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code,
      redirect_uri: REDIRECT_URI
    }, {
      headers: { "Content-Type": "application/json" }
    });

    const access_token = tokenData.access_token;
    console.log("✅ Access token recibido:", access_token);

    // 🧑 Obtener email del usuario
    const { data: userData } = await axios.get("https://api.mercadopago.com/v1/identity/userinfo", {
      headers: { Authorization: `Bearer ${access_token}` }
    });

    const email = userData.email;
    console.log("📧 Email del usuario conectado:", email);

    // 🔍 Buscar en Firestore
    const snapshot = await db.collection("usuarios").where("email", "==", email).limit(1).get();

    if (!snapshot.empty) {
      const userDoc = snapshot.docs[0];
      await userDoc.ref.update({ token: access_token });
      console.log("✅ Token guardado en Firestore para:", email);
      return res.send("✅ Conexión exitosa con Mercado Pago. Ya podés cerrar esta ventana.");
    } else {
      console.warn("❌ No se encontró un usuario con ese email en Firestore:", email);
      return res.status(404).send("❌ No se encontró un usuario con ese email en Firestore.");
    }

  } catch (error) {
    console.error("❌ Error en el callback de Mercado Pago:");
    console.error("Código:", error.code || "sin código");
    console.error("Mensaje:", error.message || "sin mensaje");
    console.error("Error.response.data:", error.response?.data || "No hay respuesta");
    console.error("Error completo:", error);

    return res.status(500).send("❌ Error al conectar con Mercado Pago. Revisá los logs del backend.");
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor backend escuchando en http://localhost:${PORT}`);
});
