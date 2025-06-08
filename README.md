# Olimpia Assistant ABAP - API de Refactorización

## Descripción

API que utiliza IA generativa de Google Cloud Vertex AI para analizar y refactorizar código ABAP, haciéndolo compatible con SAP S/4HANA siguiendo las mejores prácticas.

## Características

- Transformación de código ABAP a formato JSON estandarizado
- Refactorización de código para compatibilidad con S/4HANA
- Implementación de mejores prácticas y optimizaciones
- Recomendaciones de vistas CDS cuando corresponda

## Requisitos

- Node.js 20 o superior
- Cuenta de Google Cloud con Vertex AI habilitado
- Modelo generativo configurado en Google Cloud

## Configuración

### Variables de entorno

Crea un archivo `.env` en el directorio `src` basado en `.env.example` con las siguientes variables:

```bash

GOOGLE_CLOUD_PROJECT=tu-proyecto-gcp
GOOGLE_CLOUD_LOCATION=tu-ubicacion-gcp
GOOGLE_CLOUD_MODEL_NAME=nombre-modelo-vertexai

```

## Instalación

```bash
# Instalar dependencias
cd src
npm install

# Ejecutar en desarrollo
npm run dev

# Ejecutar en producción
npm start
```

## Despliegue con Docker

```bash
# Construir la imagen
docker build -t olimpia-assistant-abap .

# Ejecutar el contenedor
docker run -p 3000:3000 --env-file ./src/.env olimpia-assistant-abap
```

## Uso de la API

### Refactorizar código ABAP

**Endpoint:** `POST /api/abap`

**Cuerpo de la solicitud:**

```json
{
  "prompt": "Tu código ABAP aquí..."
}
```

**Respuesta:**

```json
{
  "message": "Código ABAP refactorizado correctamente",
  "codigoAbap": "Código ABAP refactorizado y optimizado para S/4HANA"
}
```

## Estructura del proyecto

```bash
├── Dockerfile
├── README.md
└── src/
    ├── .env
    ├── .env.example
    ├── .gitignore
    ├── controllers/
    ├── index.js
    └── package.json
```

## Funcionamiento

1. El usuario envía código ABAP original a través del endpoint `/api/abap`
2. La API formatea el código en formato JSON
3. Vertex AI analiza el código y aplica refactorizaciones para S/4HANA
4. La API retorna el código refactorizado con recomendaciones y mejoras

## Autor

Manuel Monjes S.

## Licencia

ISC
