import express from 'express';
import cors from 'cors';
import dotEnv from 'dotenv';
dotEnv.config();
import { VertexAI } from "@google-cloud/vertexai";

const app = express();
const port = process.env.PORT || 3000;
const corsOptions = {
	origin: '*',
	method: ['GET', 'POST'],
	allowedHeaders: ['Content-Type'],
}
const projectGCP = process.env.GOOGLE_CLOUD_PROJECT || 'agentspace-poc-etatex';
const locationProject = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';
const modelName = process.env.GOOGLE_CLOUD_MODEL_NAME || 'gemini-2.0-flash-001';

if (!projectGCP || !locationProject || !modelName) {
	throw new Error(`Faltan variables de entorno necesarias
	- GOOGLE_CLOUD_PROJECT: ${projectGCP}
	- GOOGLE_CLOUD_LOCATION: ${locationProject}
	- GOOGLE_CLOUD_MODEL_NAME: ${modelName}
		`);
} else {
	console.log(`Configuración de Google Cloud: 
		Proyecto: ${projectGCP}, 
		Ubicación: ${locationProject}, 
		Modelo: ${modelName}`);
}

const vertexAI = new VertexAI({
	project: projectGCP,
	location: locationProject,
});

const generativeModelAI = vertexAI.getGenerativeModel({
	model: modelName,
	temperature: 0.2
});

const requestPayload = (prompt) => {
	return {
		contents: [{
			role: 'user',
			parts: [{
				text: prompt
			}]
		}]
	}
}

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => {
	console.log(`${new Date().toISOString()} - ${req.method}`);
	next();
});

app.post('/api/abap', async (req, res) => {
	if (!req.body || !req.body.prompt || typeof req.body.prompt !== 'string') {
		return res.status(400).json({
			error: 'Solicitud inválida',
			details: 'El cuerpo de la solicitud debe contener un campo "prompt"',
		});
	}


	res.status(200).json({
		message: 'Solicitud recibida correctamente',
		prompt: req.body.prompt,
	})
});

app.use((err, req, res, next) => {
	res.status(500).json({
		error: 'rror interno del servidor',
		details: err.message,
	});
	throw new Error(`Error en el servidor: ${err.message}`);
});

app.use((req, res, next) => {
	res.status(404).json({
		error: 'Recurso no encontrado',
		details: `La ruta ${req.originalUrl} no existe`,
	});
});

app.listen(port, () => {
	console.log(`Servidor corriendo en http://localhost:${port}`);
});