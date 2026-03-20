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
  RefreshCw,
  Camera
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Types ---

interface TableRow {
  actividad: string;
  unidad: string;
  pu_promedio: string | number;
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
}

interface ExtractionResult {
  manzana: string;
  contrato: string;
  rows: TableRow[];
}

// --- Components ---

export default function App() {
  const [image, setImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [data, setData] = useState<ExtractionResult | null>(null);
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
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "") {
        throw new Error("Clave de API no configurada. Por favor, ve a 'Settings' -> 'Secrets' y añade tu GEMINI_API_KEY.");
      }

      const ai = new GoogleGenAI({ apiKey });
      
      const mimeTypeMatch = image.match(/^data:(.*);base64,/);
      const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : "image/jpeg";
      const base64Data = image.split(',')[1];

      const prompt = `
        Analiza esta imagen de un reporte de obra.
        Extrae la información de la tabla siguiendo este formato exacto:
        
        CAMPOS DE CABECERA:
        - manzana: El valor de "MANZANA" (si aparece).
        - contrato: El valor de "CONTRATO" (si aparece).

        COLUMNAS DE LA TABLA:
        1. actividad: Texto en la columna "ACTIVIDADES OBRA GRIS".
        2. unidad: Texto en la columna "Unidad".
        3. pu_promedio: Valor en la columna "P.U. Promedio".
        4. c1 a c14: Valores en las columnas numeradas del 1 al 14.

        REGLAS:
        - Si una celda está vacía, usa "".
        - Devuelve un objeto JSON con las llaves "manzana", "contrato" y "rows" (que es un array de los objetos de la tabla).
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-preview",
        contents: {
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: mimeType,
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
      if (!text) throw new Error("No se pudo leer la imagen.");

      const result = JSON.parse(text) as ExtractionResult;
      setData(result);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error al procesar la imagen.");
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadExcel = () => {
    if (!data) return;

    const exportData = data.rows.map(row => ({
      'ACTIVIDADES OBRA GRIS': row.actividad,
      'Unidad': row.unidad,
      'P.U. Promedio': row.pu_promedio,
      '1': row.c1, '2': row.c2, '3': row.c3, '4': row.c4, '5': row.c5, '6': row.c6, '7': row.c7,
      '8': row.c8, '9': row.c9, '10': row.c10, '11': row.c11, '12': row.c12, '13': row.c13, '14': row.c14
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    
    // Add Manzana and Contrato info at the top if available
    if (data.manzana || data.contrato) {
      XLSX.utils.sheet_add_aoa(worksheet, [
        ['MANZANA:', data.manzana || '', '', 'CONTRATO:', data.contrato || ''],
        []
      ], { origin: "A1" });
      
      // Shift existing data down
      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
      range.e.r += 2;
      worksheet['!ref'] = XLSX.utils.encode_range(range);
    }

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Reporte");
    
    // Auto-size columns
    worksheet['!cols'] = [
      { wch: 40 }, { wch: 10 }, { wch: 15 },
      ...Array(14).fill({ wch: 4 })
    ];

    XLSX.writeFile(workbook, "reporte_obra_final.xlsx");
  };

  return (
    <div className="min-h-screen bg-gray-50 text-slate-900 font-sans p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="bg-emerald-600 p-3 rounded-2xl shadow-lg shadow-emerald-200">
              <FileSpreadsheet className="text-white" size={32} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Obra a Excel</h1>
              <p className="text-slate-500 text-sm">Formato oficial de seguimiento de obra gris</p>
            </div>
          </div>
          
          <div className="flex gap-3">
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 bg-white border border-slate-200 px-5 py-2.5 rounded-xl shadow-sm hover:bg-slate-50 transition-all font-semibold text-sm"
            >
              <Camera size={18} />
              Subir Foto
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

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          {/* Preview Panel */}
          <div className="xl:col-span-4 space-y-6">
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-5 border-b border-slate-50 flex items-center justify-between">
                <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400">Imagen Original</h2>
                {image && <CheckCircle2 size={18} className="text-emerald-500" />}
              </div>
              
              <div className="aspect-square bg-slate-50 flex items-center justify-center relative group">
                {image ? (
                  <img src={image} alt="Preview" className="w-full h-full object-contain p-2" referrerPolicy="no-referrer" />
                ) : (
                  <div onClick={() => fileInputRef.current?.click()} className="cursor-pointer flex flex-col items-center text-slate-300 hover:text-emerald-400 transition-colors">
                    <ImageIcon size={64} strokeWidth={1} />
                    <p className="mt-4 font-medium">Selecciona una imagen</p>
                  </div>
                )}
              </div>

              {image && !data && !isProcessing && (
                <div className="p-5">
                  <button 
                    onClick={processImage}
                    className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 flex items-center justify-center gap-3"
                  >
                    <RefreshCw size={20} className={isProcessing ? "animate-spin" : ""} />
                    Acomodar Datos
                  </button>
                </div>
              )}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-100 p-5 rounded-3xl flex items-start gap-4 text-red-700">
                <AlertCircle className="shrink-0 mt-1" size={20} />
                <p className="text-sm font-medium leading-relaxed">{error}</p>
              </div>
            )}
          </div>

          {/* Result Panel */}
          <div className="xl:col-span-8 space-y-6">
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden flex flex-col min-h-[600px]">
              <div className="p-5 border-b border-slate-50 flex items-center justify-between bg-white sticky top-0 z-20">
                <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400">Vista Previa del Formato</h2>
                {data && (
                  <button 
                    onClick={downloadExcel}
                    className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-xl font-bold text-sm hover:bg-emerald-100 transition-colors"
                  >
                    <Download size={16} />
                    Exportar Excel
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-auto relative">
                <AnimatePresence mode="wait">
                  {isProcessing ? (
                    <motion.div 
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm z-30"
                    >
                      <Loader2 className="animate-spin text-emerald-600 mb-6" size={48} />
                      <p className="font-bold text-slate-800 text-lg">Acomodando celdas...</p>
                      <p className="text-slate-400 text-sm mt-2">Estamos organizando la información en el formato correcto</p>
                    </motion.div>
                  ) : data ? (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-0">
                      {/* Header Info */}
                      <div className="p-6 bg-slate-50/50 border-b border-slate-100 flex gap-12">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Manzana</span>
                          <span className="font-bold text-slate-900">{data.manzana || "---"}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Contrato</span>
                          <span className="font-bold text-slate-900">{data.contrato || "---"}</span>
                        </div>
                      </div>

                      {/* Table */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead className="bg-white text-[10px] font-black text-slate-400 uppercase tracking-tighter border-b border-slate-100">
                            <tr>
                              <th className="px-6 py-4 min-w-[300px] border-r border-slate-50">Actividades Obra Gris</th>
                              <th className="px-4 py-4 border-r border-slate-50">Unidad</th>
                              <th className="px-4 py-4 border-r border-slate-50">P.U. Promedio</th>
                              {[...Array(14)].map((_, i) => (
                                <th key={i} className="px-2 py-4 text-center w-10 border-r border-slate-50">{i + 1}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="text-[11px] font-medium divide-y divide-slate-50">
                            {data.rows.map((row, idx) => (
                              <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-6 py-3 font-bold text-slate-700 border-r border-slate-50">{row.actividad}</td>
                                <td className="px-4 py-3 text-slate-500 border-r border-slate-50">{row.unidad}</td>
                                <td className="px-4 py-3 text-slate-500 border-r border-slate-50">{row.pu_promedio}</td>
                                {[...Array(14)].map((_, i) => {
                                  const key = `c${i + 1}` as keyof TableRow;
                                  return (
                                    <td key={i} className="px-2 py-3 text-center text-slate-400 border-r border-slate-50">
                                      {row[key] || ""}
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </motion.div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-200 p-20 text-center">
                      <TableIcon size={80} strokeWidth={1} className="mb-6 opacity-40" />
                      <h3 className="text-xl font-bold text-slate-300">Formato Vacío</h3>
                      <p className="max-w-xs text-slate-400 mt-2 text-sm">Sube la foto de tu reporte para generar automáticamente la tabla estructurada.</p>
                    </div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
