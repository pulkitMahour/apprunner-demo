const express = require("express");
const {
	SecretsManagerClient,
	GetSecretValueCommand,
} = require("@aws-sdk/client-secrets-manager");

const app = express();
const port = process.env.PORT || 8080;
const appName = "apprunner-demo";
const appEnv = process.env.APP_ENV;

const secretName = "apprunner/pulkit-demo/config";
const client = new SecretsManagerClient({ region: process.env.AWS_REGION });

let appSecretValue = "";

async function loadSecret() {
	try {
		const response = await client.send(
			new GetSecretValueCommand({ SecretId: secretName }),
		);

		if ("SecretString" in response) {
			try {
				const parsed = JSON.parse(response.SecretString);
				appSecretValue = parsed.APP_SECRET || response.SecretString;
			} catch (error) {
				console.error("Error parsing secret string:", error);
				appSecretValue = response.SecretString;
			}
		} else {
			appSecretValue = Buffer.from(response.SecretBinary).toString("utf-8");
		}

		console.log("Secret loaded from secrets manager");
	} catch (error) {
		console.error("Error loading secret:", error);
		process.exit(1);
	}
}

async function startServer() {
	await loadSecret();

	app.get("/healthz", (req, res) => {
		res.send('ok  try "/pulkit" endpoint');
	});

	app.get("/", (req, res) => {
		res.json({
			name: appName,
			env: appEnv,
			secret: appSecretValue
		});
	});

	app.get("/pulkit", (req, res) => {
		res.send(`
		<div style="font-size: 95px; text-align: center;">
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
			<span style="color: purple;">Successful!!!!!</span>
		</marquee>
		</div>
		<div style="text-align: center; margin-top: 40px;">
		<a href="https://www.youtube.com" target="_blank">Click here to go to YouTube</a>
		</div>
	`);
	});

	app.listen(port, () => {
		console.log(`${appName} (${appEnv}) listening on port ${port}`);
		console.log(`Secret value is: ${appSecretValue}`);
	});
}

startServer();

