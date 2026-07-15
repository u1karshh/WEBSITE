# Gmail SMTP setup for morning admission emails

Use these values for Gmail:

- SMTP_SERVICE=gmail
- SMTP_HOST=smtp.gmail.com
- SMTP_PORT=587
- SMTP_USER=your-email@gmail.com
- SMTP_PASS=your-google-app-password
- SMTP_FROM=your-email@gmail.com

Important:
- Use a Google App Password, not your normal Gmail password.
- Enable 2-Step Verification on your Google account first.
- Then create an App Password from your Google Account settings.

Example in PowerShell:

- $env:SMTP_SERVICE="gmail"
- $env:SMTP_HOST="smtp.gmail.com"
- $env:SMTP_PORT="587"
- $env:SMTP_USER="your-email@gmail.com"
- $env:SMTP_PASS="your-google-app-password"
- $env:SMTP_FROM="your-email@gmail.com"

Then start the server with:

- npm install
- node server.js
