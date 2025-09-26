// Importamos las dependencias
const express = require('express');
const cors = require('cors');
const { MercadoPagoConfig, Preference, Payment } = require('mercadopago');
require('dotenv').config();

// Creamos la aplicación Express
const app = express();
const PORT = 3001;

// URL base para las redirecciones (deberás reemplazarla con la URL que te dé localtunnel)
// Ejemplo: https://your-subdomain.loca.lt
const FRONTEND_URL = process.env.FRONTEND_URL || "https://your-subdomain.loca.lt";

// Configuramos middlewares
app.use(cors());
app.use(express.json());

// Configuramos Mercado Pago con el access token
const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN || 'APP_USR-265687320599965-092519-2f47167b074d2b3236d666c524ba3629-2532794288'
});

// Inicializamos los objetos de API
const preference = new Preference(client);
const payment = new Payment(client);

// Ruta para crear una preferencia de pago
app.post('/create-preference', async (req, res) => {
  try {
    const { nombre, email, servicio, precio } = req.body;
    
    // Creamos el objeto de preferencia según la documentación de Mercado Pago
    const preferenceData = {
      items: [
        {
          title: servicio,
          unit_price: Number(precio),
          quantity: 1,
        }
      ],
      payer: {
        name: nombre,
        email: email
      },
      back_urls: {
        success: `${FRONTEND_URL}/success`,
        failure: `${FRONTEND_URL}/failure`,
        pending: `${FRONTEND_URL}/pending`
      },
      auto_return: "approved",
      // Esta URL recibirá notificaciones de los cambios de estado del pago
      notification_url: `${process.env.BACKEND_URL || "https://your-backend-subdomain.loca.lt"}/webhook`
    };

    // Creamos la preferencia en Mercado Pago
    const response = await preference.create({ body: preferenceData });
    
    // Respondemos con la URL de pago
    res.json({
      success: true,
      redirectUrl: response.init_point
    });
  } catch (error) {
    console.error('Error al crear la preferencia:', error);
    res.status(500).json({
      success: false,
      error: 'Error al crear la preferencia de pago'
    });
  }
});

// Ruta para recibir notificaciones de Mercado Pago (webhook)
app.post('/webhook', async (req, res) => {
  try {
    const { type, data } = req.body;
    
    // Solo procesamos notificaciones de tipo 'payment'
    if (type === 'payment') {
      const paymentId = data.id;
      
      // Obtenemos la información del pago desde Mercado Pago
      const paymentInfo = await payment.get({ id: paymentId });
      
      // Verificamos si el pago fue aprobado
      if (paymentInfo.status === 'approved') {
        // Aquí implementarías la lógica para enviar el email al cliente
        console.log('Pago aprobado:', paymentInfo);
        
        // Ejemplo: Enviar email (aquí deberías integrar tu servicio de email)
        // await enviarEmail(paymentInfo.payer.email, 'Acceso a la aplicación', 'Aquí están tus datos de acceso...');
      }
    }
    
    // Respondemos con éxito para que Mercado Pago sepa que recibimos la notificación
    res.status(200).send('OK');
  } catch (error) {
    console.error('Error en el webhook:', error);
    res.status(500).send('Error al procesar la notificación');
  }
});

// Ruta simple para verificar que el servidor está funcionando
app.get('/', (req, res) => {
  res.send('Servidor de integración con Mercado Pago funcionando');
});

// Iniciamos el servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
  console.log(`Para exponer tu servidor, ejecuta: npx localtunnel --port ${PORT}`);
  console.log(`Para exponer tu frontend, ejecuta: npx localtunnel --port 3000`);
  console.log(`Luego actualiza las variables de entorno FRONTEND_URL y BACKEND_URL`);
});