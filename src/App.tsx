/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import * as XLSX from 'xlsx';
import { 
  Upload, 
  FileSpreadsheet, 
  Image as ImageIcon, 
  Loader2, 
  Download, 
  AlertCircle,
  CheckCircle2,
  Table as TableIcon,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Types ---

interface TableRow {
  actividad: string;
  unidad: string;
  precio: string | number;
  c1?: string;
  c2?: string;
  c3?: string;
  c4?: string;
  c5?: string;
  c6?: string;
  c7?: string;
  c8?: string;
  c9?: string;
  c10?: string;
  c11?: string;
  c12?: string;
  c13?: string;
  c14?: string;
  observaciones?: string;
}

// --- Constants ---

const GEMINI_MODEL = "gemini-3.1-flash-preview";

// --- Components ---

export default function App() {
  const [image, setImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [data, setData] = useState<TableRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
        setData(null);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const processImage = async () => {
    if (!image) return;

    setIsProcessing(true);
    setError(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
      
      // Extract base64 data
      const base64Data = image.split(',')[1];

      const prompt = `
        Analiza esta imagen que contiene una tabla de seguimiento de obra.
        Extrae la información y estructúrala en un formato JSON.
        La tabla tiene las siguientes columnas principales:
        - Actividad (Descripción de la tarea)
        - Unidad (m2, m3, pza, etc.)
        - Precio (Valor unitario)
        - Columnas del 1 al 14 (Seguimiento numérico o marcas)
        - Observaciones (Cualquier texto adicional al final de la fila)

        Es muy importante que identifiques correctamente las filas, incluso si el texto es manuscrito.
        Si una celda está vacía, usa una cadena vacía "".
        Devuelve un array de objetos con las llaves: "actividad", "unidad", "precio", "c1", "c2", ..., "c14", "observaciones".
      `;

      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: "image/jpeg",
                  data: base64Data,
                },
              },
            ],
          },
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                actividad: { type: Type.STRING },
                unidad: { type: Type.STRING },
                precio: { type: Type.STRING },
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
                observaciones: { type: Type.STRING },
              },
              required: ["actividad", "unidad", "precio"],
            },
          },
        },
      });

      const result = JSON.parse(response.text || "[]");
      setData(result);
    } catch (err) {
      console.error(err);
      setError("Error al procesar la imagen. Asegúrate de que sea clara y contenga la tabla.");
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadExcel = () => {
    if (!data) return;

    // Map data to have friendly headers
    const exportData = data.map(row => ({
      'Actividad': row.actividad,
      'Unidad': row.unidad,
      'Precio': row.precio,
      '1': row.c1,
      '2': row.c2,
      '3': row.c3,
      '4': row.c4,
      '5': row.c5,
      '6': row.c6,
      '7': row.c7,
      '8': row.c8,
      '9': row.c9,
      '10': row.c10,
      '11': row.c11,
      '12': row.c12,
      '13': row.c13,
      '14': row.c14,
      'Observaciones': row.observaciones
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Reporte de Obra");
    
    // Auto-size columns
    const max_width = exportData.reduce((w, r) => Math.max(w, r.Actividad?.length || 0), 10);
    worksheet['!cols'] = [{ wch: max_width + 5 }];

    XLSX.writeFile(workbook, "reporte_obra_final.xlsx");
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1A1A1A] font-sans p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <FileSpreadsheet className="text-emerald-600" size={32} />
              Foto a Excel <span className="text-emerald-600">Pro</span>
            </h1>
            <p className="text-gray-500 mt-1">Transforma tus reportes de obra manuscritos en segundos.</p>
          </div>
          
          <div className="flex gap-2">
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 bg-white border border-gray-200 px-4 py-2 rounded-xl shadow-sm hover:bg-gray-50 transition-all font-medium"
            >
              <ImageIcon size={18} />
              Cambiar Imagen
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              accept="image/*" 
              className="hidden" 
            />
          </div>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Upload & Preview Image */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-4 border-bottom border-gray-50 bg-gray-50/50 flex justify-between items-center">
                <span className="text-sm font-semibold uppercase tracking-wider text-gray-400">Imagen de Origen</span>
                {image && <CheckCircle2 size={16} className="text-emerald-500" />}
              </div>
              
              <div className="aspect-[4/3] relative bg-gray-100 flex items-center justify-center">
                {image ? (
                  <img 
                    src={image} 
                    alt="Preview" 
                    className="w-full h-full object-contain"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center gap-4 cursor-pointer p-8 text-center"
                  >
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-md text-emerald-600">
                      <Upload size={32} />
                    </div>
                    <div>
                      <p className="font-semibold text-lg">Sube una foto de tu reporte</p>
                      <p className="text-gray-400 text-sm">JPG, PNG o JPEG</p>
                    </div>
                  </div>
                )}
              </div>

              {image && !data && !isProcessing && (
                <div className="p-4">
                  <button 
                    onClick={processImage}
                    className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 flex items-center justify-center gap-2"
                  >
                    <RefreshCw size={20} />
                    Procesar con IA
                  </button>
                </div>
              )}
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-50 border border-red-100 p-4 rounded-xl flex items-start gap-3 text-red-700"
              >
                <AlertCircle className="shrink-0 mt-0.5" size={20} />
                <p className="text-sm">{error}</p>
              </motion.div>
            )}
          </div>

          {/* Right Column: Data Preview & Export */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 min-h-[400px] flex flex-col">
              <div className="p-4 border-b border-gray-50 bg-gray-50/50 flex justify-between items-center">
                <span className="text-sm font-semibold uppercase tracking-wider text-gray-400">Vista Previa Estructurada</span>
                {data && (
                  <button 
                    onClick={downloadExcel}
                    className="flex items-center gap-2 text-emerald-600 font-bold text-sm hover:underline"
                  >
                    <Download size={16} />
                    Descargar Excel
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-auto p-0 relative">
                <AnimatePresence mode="wait">
                  {isProcessing ? (
                    <motion.div 
                      key="loading"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm z-10"
                    >
                      <Loader2 className="animate-spin text-emerald-600 mb-4" size={48} />
                      <p className="font-medium text-gray-600">Analizando estructura de tabla...</p>
                      <p className="text-xs text-gray-400 mt-1">Esto puede tardar unos segundos</p>
                    </motion.div>
                  ) : data ? (
                    <motion.div 
                      key="table"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="min-w-full"
                    >
                      <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 bg-gray-50 text-[10px] uppercase font-bold text-gray-400 border-b border-gray-100">
                          <tr>
                            <th className="px-4 py-3 min-w-[200px]">Actividad</th>
                            <th className="px-2 py-3">Und</th>
                            <th className="px-2 py-3">Precio</th>
                            {[...Array(14)].map((_, i) => (
                              <th key={i} className="px-1 py-3 text-center w-8">{i + 1}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="text-xs divide-y divide-gray-50">
                          {data.map((row, idx) => (
                            <tr key={idx} className="hover:bg-emerald-50/30 transition-colors">
                              <td className="px-4 py-3 font-medium text-gray-700">{row.actividad}</td>
                              <td className="px-2 py-3 text-gray-500">{row.unidad}</td>
                              <td className="px-2 py-3 text-gray-500">{row.precio}</td>
                              {[...Array(14)].map((_, i) => {
                                const key = `c${i + 1}` as keyof TableRow;
                                return (
                                  <td key={i} className="px-1 py-3 text-center text-gray-400">
                                    {row[key] || "-"}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </motion.div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-gray-300 p-12 text-center">
                      <TableIcon size={64} className="mb-4 opacity-20" />
                      <p className="max-w-xs">Sube una imagen y presiona "Procesar" para ver los datos aquí.</p>
                    </div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {data && (
              <div className="bg-emerald-600 rounded-2xl p-6 text-white shadow-xl shadow-emerald-100 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold">¡Listo para exportar!</h3>
                  <p className="text-emerald-100 text-sm">Se han detectado {data.length} filas con éxito.</p>
                </div>
                <button 
                  onClick={downloadExcel}
                  className="bg-white text-emerald-600 px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-emerald-50 transition-all"
                >
                  <Download size={20} />
                  Descargar .XLSX
                </button>
              </div>
            )}
          </div>
        </main>

        {/* Footer Info */}
        <footer className="mt-12 pt-8 border-t border-gray-100 text-center text-gray-400 text-sm">
          <p>© 2026 Foto a Excel Pro - Desarrollado con Inteligencia Artificial</p>
        </footer>
      </div>
    </div>
  );
}
