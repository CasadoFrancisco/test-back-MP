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
  console.log('🔵 INICIO: Solicitud recibida para crear preferencia');
  console.log('📝 Datos recibidos:', req.body);
  
  try {
    const { nombre, email, servicio, precio } = req.body;
    console.log(`👤 Datos del cliente - Nombre: ${nombre}, Email: ${email}`);
    console.log(`🛒 Datos del servicio - Servicio: ${servicio}, Precio: ${precio}`);
    
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
    
    console.log('📋 Objeto de preferencia creado:', JSON.stringify(preferenceData, null, 2));
    console.log('🔄 Enviando solicitud a Mercado Pago...');

    // Creamos la preferencia en Mercado Pago
    const response = await preference.create({ body: preferenceData });
    
    console.log('✅ Preferencia creada exitosamente');
    console.log('🆔 Preference ID:', response.id);
    console.log('🔗 URL de pago (init_point):', response.init_point);
    console.log('📊 Respuesta completa de Mercado Pago:', JSON.stringify(response, null, 2));
    
    // Respondemos con la URL de pago y el ID de preferencia
    res.json({
      success: true,
      redirectUrl: response.init_point,
      preferenceId: response.id
    });
    
    console.log('🟢 FIN: Respuesta enviada al cliente');
  } catch (error) {
    console.error('🔴 ERROR al crear la preferencia:', error);
    console.error('📄 Detalles del error:', JSON.stringify(error, null, 2));
    res.status(500).json({
      success: false,
      error: 'Error al crear la preferencia de pago'
    });
    console.log('🔴 FIN: Respuesta de error enviada al cliente');
  }
});

// Ruta para recibir notificaciones de Mercado Pago (webhook)
app.post('/webhook', async (req, res) => {
  console.log('🔵 INICIO: Webhook recibido de Mercado Pago');
  console.log('📝 Datos del webhook:', JSON.stringify(req.body, null, 2));
  
  // Respondemos inmediatamente con éxito para evitar timeout
  res.status(200).send('OK');
  
  try {
    const { type, data, action } = req.body;
    console.log(`📌 Tipo de notificación: ${type}`);
    console.log(`📌 Acción: ${action}`);
    console.log(`📄 Datos recibidos: ${JSON.stringify(data, null, 2)}`);
    
    // Procesamos notificaciones de tipo 'payment' o acción 'payment.updated'
    if (type === 'payment' || action === 'payment.updated') {
      // Extraemos el ID del pago correctamente según la estructura
      const paymentId = typeof data === 'object' && data.id ? data.id : data;
      console.log(`💰 ID de pago recibido: ${paymentId}`);
      
      // Para pruebas, si el ID es muy corto (como "12"), simplemente lo registramos sin consultar a la API
      if (paymentId === "12" || paymentId.length < 5) {
        console.log('⚠️ ID de prueba detectado, omitiendo consulta a la API');
        return;
      }
      
      console.log('🔄 Consultando información del pago a Mercado Pago...');
      
      try {
        // Obtenemos la información del pago desde Mercado Pago
        const paymentInfo = await payment.get({ id: paymentId });
        
        console.log('📊 Información completa del pago:', JSON.stringify(paymentInfo, null, 2));
        console.log(`📊 Estado del pago: ${paymentInfo.status}`);
        
        // Verificamos si el pago fue aprobado
        if (paymentInfo.status === 'approved') {
          console.log('✅ Pago APROBADO');
          // Aquí implementarías la lógica para enviar el email al cliente
          console.log('📧 Aquí se enviaría el email al cliente');
        } else {
          console.log(`ℹ️ Pago en estado: ${paymentInfo.status}`);
        }
      } catch (paymentError) {
        console.error('🔴 Error al obtener información del pago:', paymentError);
      }
    }
    
    console.log('🔵 FIN: Procesamiento del webhook completado');
    
  } catch (error) {
    console.error('🔴 ERROR en el procesamiento del webhook:', error);
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