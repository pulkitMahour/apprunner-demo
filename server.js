const express = require('express');
const app = express();
const port = process.env.PORT || 8080;
const appName = 'apprunner-demo';
const appEnv = process.env.APP_ENV;

app.get('/healthz', (req, res) => {
  res.send('ok');
});

app.get('/', (req, res) => {
  res.json({ name: appName, env: appEnv });
});

app.listen(port, () => {
  console.log(`${appName} listening on port ${port}`);
});