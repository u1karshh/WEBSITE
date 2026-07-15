const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const cron = require('node-cron');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const subscribersFile = path.join(__dirname, 'subscribers.json');

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

function loadSubscribers() {
  if (!fs.existsSync(subscribersFile)) return [];
  try {
    return JSON.parse(fs.readFileSync(subscribersFile, 'utf8'));
  } catch {
    return [];
  }
}

function saveSubscribers(subscribers) {
  fs.writeFileSync(subscribersFile, JSON.stringify(subscribers, null, 2));
}

function getTransporter() {
  const service = process.env.SMTP_SERVICE || '';
  const host = process.env.SMTP_HOST || (service.toLowerCase() === 'gmail' ? 'smtp.gmail.com' : '');
  const port = Number(process.env.SMTP_PORT || (service.toLowerCase() === 'gmail' ? 587 : 587));
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    service: service || undefined
  });
}

function buildMorningEmail() {
  return `
Hello,

Here is your morning admission update for 2026:

- JoSAA: Round 4 seat allocation result is available on the official portal.
- BITSAT: Official BITS admissions portal is live for 2026 updates.
- MHT-CET: CAP registration is active, but no CAP round has started yet.

Visit the official portals for the latest details:
- JoSAA: https://josaa.nic.in/
- BITS: https://admissions.bits-pilani.ac.in/
- MHT-CET: https://cetcell.mahacet.org/

Regards,
Admission Updates
  `.trim();
}

app.post('/subscribe', (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ ok: false, message: 'Please enter a valid email address.' });
  }

  const subscribers = loadSubscribers();
  if (!subscribers.includes(email)) {
    subscribers.push(email);
    saveSubscribers(subscribers);
  }

  const transporter = getTransporter();
  if (!transporter) {
    return res.json({ ok: true, message: 'Subscribed successfully. Email delivery is not configured yet.' });
  }

  transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: email,
    subject: 'Welcome to admission updates',
    text: 'Thanks for subscribing. You will receive morning updates from this service.'
  }).catch(() => {});

  res.json({ ok: true, message: 'Subscribed successfully.' });
});

cron.schedule('0 8 * * *', () => {
  const subscribers = loadSubscribers();
  const transporter = getTransporter();
  if (!transporter || !subscribers.length) return;

  const mail = {
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    subject: 'Morning admission updates',
    text: buildMorningEmail()
  };

  subscribers.forEach((email) => {
    transporter.sendMail({ ...mail, to: email }).catch(() => {});
  });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/health', (req, res) => {
  res.json({ ok: true, message: 'Service is running.' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
