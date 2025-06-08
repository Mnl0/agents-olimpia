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
const projectGCP = process.env.GOOGLE_CLOUD_PROJECT;
const locationProject = process.env.GOOGLE_CLOUD_LOCATION;
const modelName = process.env.GOOGLE_CLOUD_MODEL_NAME;

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

const agentInstructions = (promptUser) => {
	return `
	Como asistente especializado, tu tarea es convertir código ABAP en un formato JSON estandarizado. 

	Instrucciones:
	1. Recibirás como entrada un fragmento de código ABAP proporcionado por el usuario.
	2. Debes transformarlo en un objeto JSON con la siguiente estructura exacta:
		{
			"codigoAbap": "[código ABAP original]"
		}
	3. Conserva todo el contenido original del código ABAP como un string válido, escapando correctamente los caracteres especiales si es necesario.
	4. Asegúrate de que el JSON generado sea válido y pueda ser procesado automáticamente por sistemas downstream.

	Consideraciones:
	- Mantén el formato original del código (incluyendo saltos de línea y sangrías)
	- No interpretes ni modifiques el código ABAP recibido
	- El campo "codigoAbap" debe contener exactamente el input del usuario

	${promptUser}

`;
}

const agentInstructionAbapCode = (resultIA) => {
	return `
			Eres desarrollador ABAP experto especializado en migraciones a S/4HANA, su tarea consiste en analizar el código ABAP proporcionado desde una versión anterior de SAP ECC y proporcionar una versión completa y refactorizada, totalmente compatible con SAP S/4HANA.

			Su análisis y refactorización deben cumplir los siguientes principios:

			1. Compatibilidad con S/4HANA y mejores prácticas:
			* Obsolescencia de sintaxis y sentencias: Identifique y reemplace cualquier sentencia ABAP obsoleta (p. ej., consideraciones de rendimiento de \`\`SELECT ... FOR ALL ENTRIES\`, declaraciones implícitas de áreas de trabajo, uso de \`\`FIELD-SYMBOLS\` para tablas internas).
			* Cambios en el modelo de datos: Considere modelos de datos simplificados (p. ej., MATDOC en lugar de MKPF/MSEG, ACDOCA para documentos financieros). Reemplace el acceso directo a tablas con vistas CDS cuando sea apropiado y eficiente. * Optimización del rendimiento: Sugerir e implementar mejoras de rendimiento relevantes para S/4HANA (p. ej., usar la sintaxis \`NEW\` para operaciones internas de tablas, evitar bucles innecesarios y aprovechar \`FOR ... IN TABLE\`).
			* Mejoras de OPEN SQL: Utilizar las nuevas funciones de OPEN SQL para mejorar la legibilidad y el rendimiento (p. ej., \`INTO TABLE @DATA(...)\`, \`CORRESPONDING FIELDS OF\`).
			* Procedimientos de base de datos administrada AMDP/ABAP: Si la lógica requiere un uso intensivo de datos y se puede beneficiar de la carga de la base de datos, sugerir y proporcionar implementaciones de AMDP como alternativa, explicando el fundamento.
			* Adherencia a la lista de simplificación: Asegurarse de que el código se ajuste a la lista de simplificación de S/4HANA. Abordar cualquier funcionalidad o transacción obsoleta.

			2. Recomendación e implementación de la vista CDS:

			* Identificar oportunidades: Analizar los patrones de acceso a la base de datos existentes y determinar si la lógica de recuperación de datos puede encapsularse y optimizarse mediante vistas de Core Data Services (CDS). Buscar:

			* Uniones frecuentes entre varias tablas.

			* Sentencias SELECT complejas con agregaciones o cálculos.

			* Requisitos de exposición de datos para aplicaciones Fiori o consumo externo.

			* Proporcionar código CDS: Si se recomienda una vista CDS, proporcionar el código fuente DDL completo de la vista CDS en un bloque separado, incluyendo:

			* Anotaciones apropiadas (p. ej., @AbapCatalog.sqlViewName, @OData.publish).

			* Asociaciones y uniones.

			* Campos calculados o agregaciones.

			* Parámetros de entrada si es necesario.

			* Refactorizar ABAP para usar CDS: Modificar el código ABAP original para consumir la vista CDS recién creada en lugar del acceso directo a la tabla.

			3. Formato de salida:

			* Código ABAP refactorizado: Proporcione el código ABAP refactorizado completo, destacando los cambios realizados y añadiendo comentarios para explicar las modificaciones significativas.

			* Código de vista CDS (si se recomienda): Presente el código fuente DDL completo para la vista CDS recomendada.

			* Explicación y justificación: Para cada cambio o recomendación significativos (especialmente para vistas CDS o AMDP), proporcione una explicación concisa de *por qué* se realizó el cambio y los beneficios que aporta en el contexto de S/4HANA (por ejemplo, rendimiento, simplificación, cumplimiento de las mejores prácticas).


			4. Aclaración de entrada: El código ABAP que se analizará se le proporcionará directamente como consulta de entrada. Su tarea es procesar ese código ABAP según las instrucciones anteriores.

			---
			Código ABAP a analizar:
			${resultIA}
			---
	`
}

app.use(cors(corsOptions));
app.use(express.json({ type: 'application/json' }));
app.use(express.text({ type: 'text/plain' }));
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
	if (req.body) {
		req.body = req.body
			.replace(/\\/g, '\\\\')  // Escapa backslashes
			.replace(/"/g, '\\"')     // Escapa comillas
			.replace(/\r?\n/g, '\n')  // Normaliza saltos de línea
			.replace(/\t/g, '    ');
		if (!req.body.match(/\b(TYPES|DATA|SELECT|METHODS)\b/i)) {
			return res.status(400).json({
				error: "'Codigo ABAP no valido",
				details: 'El texto no parece contener estructura ABAP valida'
			})
		}
	}
	next();
});


app.use((req, res, next) => {
	console.log(`${new Date().toISOString()} - ${req.method} - ${req.body ? JSON.stringify(req.body) : 'Sin cuerpo'} - ${req.originalUrl}`);
	next();
});

app.post('/api/abap', async (req, res) => {
	if (!req.body) {
		return res.status(400).json({
			error: 'Solicitud inválida',
			details: 'El cuerpo de la solicitud debe contener un campo "prompt"',
		});
	}
	const prompt = req.body;
	const fullPrompt = agentInstructions(prompt);
	const payload = requestPayload(fullPrompt);
	console.log('Iniciando la transformación del código ABAP a JSON...');
	const transformationToString = await generativeModelAI.generateContent(payload);
	const response = transformationToString.response;

	if (!response || !response.candidates || response.candidates.length === 0 || !response.candidates[0].content || !response.candidates[0].content.parts || response.candidates[0].content.parts.length === 0) {
		throw new Error('No se pudo transformar el código ABAP a un formato JSON válido.');
	}
	const transformedCode = response.candidates[0].content.parts[0].text;
	console.log('Código ABAP transformado a JSON correctamente');

	const finalPrompt = agentInstructionAbapCode(transformedCode);
	const finalPayload = requestPayload(finalPrompt);
	console.log('Iniciando la generación del código ABAP refactorizado...');
	const finalResponse = await generativeModelAI.generateContent(finalPayload);
	const finalResult = finalResponse.response;
	if (!finalResult || !finalResult.candidates || finalResult.candidates.length === 0 || !finalResult.candidates[0].content || !finalResult.candidates[0].content.parts || finalResult.candidates[0].content.parts.length === 0) {
		throw new Error('No se pudo generar el código ABAP refactorizado.');
	}
	const finalCode = finalResult.candidates[0].content.parts[0].text;
	res.status(200).json({
		message: 'Código ABAP refactorizado correctamente',
		codigoAbap: finalCode,
	});
	console.log('Código ABAP refactorizado y enviado al cliente :)');
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