require('dotenv').config();

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./docs/swagger');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
// City Survey currently uses only auth and user routes.
// const masterRoutes = require('./routes/master');
// const eventRoutes = require('./routes/event');
// const attendeesportalRoutes = require('./routes/attendeesportal');
// const fileuploaddownloadRoutes = require('./routes/fileuploaddownload');
// const emailServiceRoutes = require('./routes/emailcontroller');
// const fileUpload = require("express-fileupload");
// const paymentRoutes = require('./routes/payment');   
const app = express();
app.use(express.json());
app.use(bodyParser.json());
app.use(cors());
// app.use(fileUpload());
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
 
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
 
  next();
});
 
// app.use('/api/email-service', emailServiceRoutes); 
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
// app.use('/api/master', masterRoutes);
// app.use('/api/event', eventRoutes);
// app.use('/api/attendeesportal', attendeesportalRoutes);
// app.use('/api/file', fileuploaddownloadRoutes);
// app.use('/api/payment', paymentRoutes); 
app.use('/api/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
const port = process.env.PORT || 3000;

const server = app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${port} is already in use. Stop the existing process or update PORT in .env.`);
    process.exit(1);
  }

  throw error;
});
