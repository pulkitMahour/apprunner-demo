const express = require('express');
const app = express();
const port = process.env.PORT || 8080;
const appName = 'apprunner-demo';
const appEnv = process.env.APP_ENV;

app.get('/healthz', (req, res) => {
  res.send('ok  try "/pulkit" endpoint');
});

app.get('/', (req, res) => {
  res.json({ name: appName, env: appEnv });
});

app.get('/pulkit', (req, res) => {
  res.send(`
    <div style="font-size: 90px; text-align: center;">
      <marquee behavior="scroll" direction="left" scrollamount="15">
        <span style="color: red;">You</span>
        <span style="color: blue;">have</span>
        <span style="color: green;">pushed</span>
        <span style="color: orange;">the</span>
        <span style="color: purple;">new</span>
        <span style="color: red;">changes!</span>
        <span style="color: blue;">Deployment</span>
        <span style="color: green;">has</span>
        <span style="color: orange;">been</span>
        <span style="color: purple;">successful!</span>
      </marquee>
    </div>
  `);
});

app.listen(port, () => {
  console.log(`${appName} listening on port ${port}`);
});