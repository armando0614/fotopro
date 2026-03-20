import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware para JSON con límite aumentado para imágenes base64
  app.use(express.json({ limit: '10mb' }));

  // API Route para procesar la imagen
  app.post("/api/process-image", async (req, res) => {
    try {
      const { image, mimeType } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "") {
        return res.status(500).json({ 
          error: "⚠️ FALTA LA CLAVE DE API: Por favor, ve al menú de 'Settings' (engranaje) -> 'Secrets' y añade una variable llamada GEMINI_API_KEY con tu clave de Google AI Studio." 
        });
      }

      const ai = new GoogleGenAI({ apiKey });
      const base64Data = image.split(',')[1] || image;

      const prompt = `
        Analiza esta imagen de un reporte de obra.
        Extrae la información de la tabla y conviértela a un array JSON.
        
        CAMPOS DE CABECERA (si existen):
        - manzana: El valor de "MANZANA".
        - contrato: El valor de "CONTRATO".

        COLUMNAS DE LA TABLA:
        1. actividad: Texto en la columna "ACTIVIDADES OBRA GRIS".
        2. unidad: Texto en la columna "Unidad".
        3. pu_promedio: Valor en la columna "P.U. Promedio".
        4. c1 a c14: Valores en las columnas numeradas del 1 al 14.

        REGLAS:
        - Si el texto es manuscrito, léelo con cuidado.
        - Si una celda está vacía, usa "".
        - Devuelve un objeto JSON con las llaves "manzana", "contrato" y "rows" (array de objetos).
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: {
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: mimeType || "image/jpeg",
                data: base64Data,
              },
            },
          ],
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              manzana: { type: Type.STRING },
              contrato: { type: Type.STRING },
              rows: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    actividad: { type: Type.STRING },
                    unidad: { type: Type.STRING },
                    pu_promedio: { type: Type.STRING },
                    c1: { type: Type.STRING },
                    c2: { type: Type.STRING },
                    c3: { type: Type.STRING },
                    c4: { type: Type.STRING },
                    c5: { type: Type.STRING },
                    c6: { type: Type.STRING },
                    c7: { type: Type.STRING },
                    c8: { type: Type.STRING },
                    c9: { type: Type.STRING },
                    c10: { type: Type.STRING },
                    c11: { type: Type.STRING },
                    c12: { type: Type.STRING },
                    c13: { type: Type.STRING },
                    c14: { type: Type.STRING },
                  },
                  required: ["actividad", "unidad", "pu_promedio"],
                },
              },
            },
            required: ["rows"],
          },
        },
      });

      const text = response.text;
      if (!text) {
        return res.status(400).json({ error: "La IA no pudo procesar la imagen. Intenta con una foto más clara." });
      }

      res.json(JSON.parse(text));
    } catch (error: any) {
      console.error("Error en el servidor:", error);
      res.status(500).json({ error: error.message || "Error interno del servidor" });
    }
  });

  // Vite middleware para desarrollo
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
  });
}

startServer();
