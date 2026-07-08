// const nodemailer = require('nodemailer');
// require('dotenv').config();

// const transporter = nodemailer.createTransport({
//   host: 'us2.smtp.mailhostbox.com',
//   port: 587,              
//   secure: false,              // Set to true if port is 465
//   auth: {
//     user: 'donotreply2@devxportal.com',
//     pass: 'JQWt#*r9',  
//   },
//   tls: {
//     rejectUnauthorized: false,
//   },
//   // logger: true,
//   // debug: true
// });
 
// transporter.verify((error, success) => {
//   if (error) {
//     console.error('SMTP Connection Error:', error.message);
//   } else {
//     console.log('SMTP Server is ready to send emails');
//   }
// });
 
// module.exports = transporter;

const nodemailer = require('nodemailer');
 
const transporter = nodemailer.createTransport({
  host: 'mail.cssoffice.sg',
  port: 587,              
  secure: false,              // Set to true if port is 465
  auth: {
    user: 'dev@cssoffice.sg',
    pass: 'CSSdemo@0736',  
  },
  tls: {
    rejectUnauthorized: false,
  },
  //  logger: true,
  // debug: true
});
 
transporter.verify((error, success) => {
  if (error) {
    console.error('SMTP Connection Error:', error.message);
  } else {
    console.log('SMTP Server is ready to send emails');
  }
});
 
module.exports = transporter;