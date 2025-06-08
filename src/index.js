import express from 'express';
import cors from 'cors';
import dotEnv from 'dotenv';
dotEnv.config();
import { VertexAI } from "@google-cloud/vertexai";

const app = express();
const port = process.env.PORT || 8080;
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const { GOOGLE_CLOUD_PROJECT, GOOGLE_CLOUD_LOCATION, GOOGLE_CLOUD_MODEL_NAME } = process.env;

if (!GOOGLE_CLOUD_PROJECT || !GOOGLE_CLOUD_LOCATION || !GOOGLE_CLOUD_MODEL_NAME) {
	console.error('Faltan variables de entorno críticas para Vertex AI.');
	process.exit(1);
}

console.log(`Configuración de Google Cloud: 
	Proyecto=${GOOGLE_CLOUD_PROJECT}, 
	Ubicación=${GOOGLE_CLOUD_LOCATION}, 
	Modelo=${GOOGLE_CLOUD_MODEL_NAME}`);

const vertexAI = new VertexAI({
	project: GOOGLE_CLOUD_PROJECT,
	location: GOOGLE_CLOUD_LOCATION,
});

const generativeModelAI = vertexAI.getGenerativeModel({
	model: GOOGLE_CLOUD_MODEL_NAME,
	generationConfig: {
		temperature: 0.2,
		maxOutputTokens: 8192,
	}
});

const getRefactoringPrompt = (abapCode) => `
    Eres un desarrollador ABAP experto especializado en migraciones a S/4HANA. Tu tarea es analizar el siguiente código ABAP proporcionado desde una versión de SAP ECC y proporcionar una versión completa y refactorizada que sea totalmente compatible con SAP S/4HANA.

    Tu análisis y refactorización deben cumplir los siguientes principios:

    1. **Compatibilidad con S/4HANA y Mejores Prácticas:**
       - **Obsolescencia:** Reemplaza sintaxis y sentencias obsoletas (p. ej., consideraciones de rendimiento de \`SELECT ... FOR ALL ENTRIES\`, declaraciones de áreas de trabajo implícitas, uso de \`FIELD-SYMBOLS\`).
       - **Modelo de Datos:** Adapta el código a modelos de datos simplificados (p. ej., MATDOC en lugar de MKPF/MSEG, ACDOCA para documentos financieros). Usa vistas CDS en lugar de acceso directo a tablas cuando sea apropiado.
       - **Rendimiento:** Implementa mejoras de rendimiento para S/4HANA (p. ej., sintaxis \`NEW\`, evitar bucles innecesarios, usar \`FOR ... IN TABLE\`).
       - **OPEN SQL:** Utiliza las nuevas características de OPEN SQL (\`INTO TABLE @DATA(...)\`, \`CORRESPONDING FIELDS OF\`).

    2. **Recomendación de Vistas CDS:**
       - **Identifica Oportunidades:** Busca uniones complejas, cálculos o lógica de negocio que puedan ser encapsulados en vistas CDS.
       - **Proporciona el Código:** Si recomiendas una vista CDS, incluye el código DDL completo en un bloque de código separado y explica su propósito.

    3. **Formato de Salida:**
       - **Código Refactorizado:** Proporciona el código ABAP refactorizado completo. Usa comentarios dentro del código para explicar modificaciones importantes.
       - **Explicación y Justificación:** En una sección separada después del código, explica *por qué* se realizaron los cambios y los beneficios que aportan (rendimiento, simplicidad, etc.).

    ---
    **Código ABAP a analizar:**
    \`\`\`abap
    ${abapCode}
    \`\`\`
    ---
`;

app.use((req, res, next) => {
	console.log(`${new Date().toISOString()} - ${req.method}`);
	next();
});

app.post('/api/abap', async (req, res) => {
	try {
		console.log(`Petición recibida en /api/abap`);

		const { prompt } = req.body;
		if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
			console.error('Error de validación: el campo "prompt" está vacío o no es un string.');
			return res.status(400).json({
				error: 'Solicitud inválida',
				details: 'El cuerpo de la solicitud debe contener un campo "prompt" con el código ABAP.',
			});
		}

		console.log(`Código ABAP recibido (primeros 200 caracteres): ${prompt.substring(0, 200)}...`);

		const finalPrompt = getRefactoringPrompt(prompt);
		const request = {
			contents: [{ role: 'user', parts: [{ text: finalPrompt }] }],
		};

		console.log('Iniciando la llamada al modelo generativo de Vertex AI...');
		const response = await generativeModelAI.generateContent(request);

		const refactoredCode = response?.response?.candidates?.[0]?.content?.parts?.[0]?.text;

		if (!refactoredCode) {
			console.error('Error: La respuesta de la API de Vertex AI no tiene el formato esperado o está vacía.', JSON.stringify(response, null, 2));
			throw new Error('No se pudo generar el código ABAP refactorizado. La respuesta de la IA estaba vacía.');
		}

		console.log('Código ABAP refactorizado generado correctamente.');

		res.status(200).json({
			abapCodeRefactored: refactoredCode
		});

		console.log('Respuesta enviada exitosamente al cliente.');

	} catch (error) {
		console.error('Error durante el procesamiento de la solicitud /api/abap:', error);
		next(error);
	}
});

app.use((err, req, res, next) => {
    if (res.headersSent) {
        return next(err);
    }
    res.status(500).json({
        error: 'Error interno del servidor',
        details: err.message || 'Ha ocurrido un error inesperado.',
    });
});

app.use((req, res) => {
    res.status(404).json({
        error: 'Recurso no encontrado',
        details: `La ruta ${req.originalUrl} no existe.`,
    });
});

app.listen(port, () => {
    console.log(`Servidor corriendo en el puerto ${port}`);
});