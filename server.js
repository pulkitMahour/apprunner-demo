const express = require("express");
const multer = require("multer");
const path = require("path");
const {SecretsManagerClient, GetSecretValueCommand} = require("@aws-sdk/client-secrets-manager");
const { S3Client, PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const app = express();
const port = process.env.PORT || 8080;
const appName = "apprunner-demo";
const appEnv = process.env.APP_ENV;

const s3Client = new S3Client({ region: process.env.AWS_REGION });
const S3_BUCKET = "pulkit-bucket-1";

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
	} 
	catch (error) {
		console.error("Error loading secret:", error);
		process.exit(1);
	}
}

async function startServer() {
	await loadSecret();

	app.get("/healthz", (req, res) => {
		res.send('ok  try "/pulkit" endpoint');
	});

	app.use(express.static(path.join(__dirname, "public")));

	app.get("/api/info", (req, res) => {
		res.json({
			name: appName,
			env: appEnv,
			secret: appSecretValue
		})
	})

	const upload = multer({storage: multer.memoryStorage(), limits: {fileSize: 5 * 1024 * 1024}});

	app.post("/upload", upload.single("file"), async (req, res) => {
		try {
			if (!req.file) {
				return res.status(400).send("No file uploaded.");
			}
			
			const filename = req.file.originalname.replace(/\s+/g, '-');
			const key = `${Date.now()}-${filename}`;
			
			const putCmd = new PutObjectCommand({
				Bucket: S3_BUCKET,
				Key: key,
				Body: req.file.buffer,
				ContentType: req.file.mimetype,
				ServerSideEncryption: "AES256"
			});

			await s3Client.send(putCmd);

			const getCmd = new GetObjectCommand({
				Bucket: S3_BUCKET,
				Key: key
			});

			const signedUrl = await getSignedUrl(s3Client, getCmd, { expiresIn: 60 });

			return res.json({key, url: signedUrl});
		} 
		catch (error) {
			console.error("Error uploading file:", error);
			return res.status(500).json({error: 'Upload failed', details: error.message})
		}
	});

	app.get("/files/:key", async (req, res) => {
		try {
			const key = req.params.key;

			const getCmd = new GetObjectCommand({
				Bucket: S3_BUCKET,
				Key: key
			});
			
			const signedUrl = await getSignedUrl(s3Client, getCmd, { expiresIn: 60 });
			return res.redirect(signedUrl);
		} 
		catch (error) {
			console.error("Error getting file:", error);
			return res.status(404).send("File not found");
		}
	});

	app.get("/list", async (req, res) => {
		try {
			const data = await s3Client.send(new ListObjectsV2Command({ Bucket: S3_BUCKET }));

			if (!data.Contents || data.Contents.length === 0) {
				return res.json([]);
			}

			const files = await Promise.all(
				data.Contents.map(async (item) => {
					const getCmd = new GetObjectCommand({
						Bucket: S3_BUCKET,
						Key: item.Key
					});
					const signedUrl = await getSignedUrl(s3Client, getCmd, { expiresIn: 60 });
					return { key: item.Key, url: signedUrl };
				})
			);

			res.json(files);
		} 
		catch (error) {
			console.error("Error listing files:", error);
			return res.status(500).json({error:"Error listing files"});
		}
	});

	app.listen(port, () => {
		console.log(`${appName} (${appEnv}) listening on port ${port}`);
		console.log(`Secret value is: ${appSecretValue}`);
	});
}

startServer();

