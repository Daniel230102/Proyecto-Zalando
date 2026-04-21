/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { motion, AnimatePresence } from "motion/react";
import { Send, User, Bot, RefreshCcw, ClipboardList, AlertCircle, ShoppingBag, Package, Truck, Ruler, FileText, ChevronRight } from "lucide-react";

// Types
interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const SYSTEM_INSTRUCTION = `Eres el asistente oficial de soporte de Zalando para la gestión de incidencias de clientes.

Tu misión es ofrecer una experiencia de servicio al cliente de lujo, profesional y eficiente, guiando al usuario paso a paso para abrir una incidencia.

Objetivo:
- Recopilar todos los datos obligatorios con un tono atento y directo.
- Una sola instrucción o pregunta por turno.
- Zalando prioriza la rapidez: si el cliente da varios datos, reconócelos y ve al siguiente.
- El Número de Pedido es CRÍTICO. Solicítalo amablemente pero con prioridad.

Tipos de incidencia Zalando:
1. Devolución (Return).
2. Entrega no recibida (Failed Delivery).
3. Cambio de talla (Size Change).
4. Problema de facturación/pago (Billing/Payment).

Datos obligatorios:
- Nombre completo del cliente.
- Email registrado en Zalando.
- Número de pedido (Order ID).
- Categoría de incidencia.
- Descripción detallada del problema.
- Artículo(s) afectado(s).
- Fecha del suceso.
- Confirmación final del cliente.

Datos condicionales:
- Devolución: ¿Está en su caja original? ¿Etiquetas intactas? Motivo.
- Entrega fallida: ¿Aparece como entregado en el seguimiento?
- Cambio de talla: Talla actual y talla deseada (verificar stock imaginario positivamente).
- Facturación: Referencia de pago o importe en disputa.

Formato de salida:
- Español impecable.
- Tono: Profesional, empático, corporativo (estilo Zalando).
- Resumen final estructurado bajo el encabezado "RESUMEN DE INCIDENCIA ZALANDO" con:
  - Cliente
  - Pedido
  - Tipo
  - Descripción
  - Estado: Listo para tramitación.

No inventes datos. No permitas incidencias incompletas.`;

const LOGOS = {
  Z: (
    <svg viewBox="0 0 100 100" className="w-10 h-10 fill-current">
      <path d="M20 20 L80 20 L20 80 L80 80 Z" strokeWidth="6" stroke="currentColor" fill="none" />
    </svg>
  )
};

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const aiRef = useRef<GoogleGenAI | null>(null);

  useEffect(() => {
    const key = process.env.GEMINI_API_KEY || import.meta.env.VITE_GEMINI_API_KEY;
    if (key && key !== '') {
      aiRef.current = new GoogleGenAI({ apiKey: key });
      startConversation();
    } else {
      setError("Falta la GEMINI_API_KEY. Por favor, configúrela en el panel de Vercel y haga un 'Redeploy'.");
    }
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages, isLoading]);

  const startConversation = async () => {
    if (!aiRef.current) return;
    setIsLoading(true);
    try {
      const response = await aiRef.current.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ role: 'user', parts: [{ text: "Hola, soy un cliente de Zalando y necesito ayuda. Por favor, inicia el protocolo de soporte." }] }],
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
        },
      });
      
      const greeting = response.text || "Bienvenido al soporte oficial de Zalando. ¿En qué puedo asistirle hoy?";
      setMessages([{ role: 'assistant', content: greeting }]);
      setIsAuthReady(true);
    } catch (err) {
      console.error("Error starting conversation:", err);
      setError("No se pudo conectar con el servidor. Verifique su conexión y la API Key.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async (customText?: string) => {
    if (!aiRef.current) {
      setError("El asistente no está inicializado.");
      return;
    }
    const textToSend = customText || input;
    if (!textToSend.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: textToSend };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);

    const history = messages.map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }]
    }));

    try {
      const response = await aiRef.current.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          ...history,
          { role: 'user', parts: [{ text: textToSend }] }
        ],
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          temperature: 0.1, 
        },
      });

      const assistantMessage: Message = { 
        role: 'assistant', 
        content: response.text || "Lo sentimos, estamos experimentando dificultades técnicas. Repita su consulta." 
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      console.error("Error generating content:", err);
      setError("La red de soporte ha fallado. Reintentando...");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F0F0F0] flex flex-col font-sans selection:bg-zalando-orange selection:text-white">
      {/* Zalando Top Navigation Bar */}
      <nav className="bg-white border-b border-zinc-200 h-14 flex items-center px-4 md:px-8 justify-between sticky top-0 z-50">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="text-zalando-orange transition-transform hover:scale-105 duration-300">
              <ShoppingBag size={28} strokeWidth={2.5} />
            </div>
            <span className="font-black text-2xl tracking-tighter uppercase">Zalando</span>
          </div>
          <div className="hidden lg:flex gap-6 text-[13px] font-bold uppercase tracking-tight text-zinc-500 mt-1">
            <span className="cursor-pointer hover:text-zalando-orange transition-colors">Mujer</span>
            <span className="cursor-pointer hover:text-zalando-orange transition-colors">Hombre</span>
            <span className="cursor-pointer hover:text-zalando-orange transition-colors">Niños</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => { setMessages([]); startConversation(); }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-black text-[12px] font-bold uppercase tracking-wide hover:bg-black hover:text-white transition-all"
          >
            <RefreshCcw size={14} />
            <span>Reiniciar</span>
          </button>
        </div>
      </nav>

      {/* Hero Section / Promotion Area (Zalando vibe) */}
      <div className="bg-zalando-orange h-1.5 w-full"></div>

      {/* Main Support Workspace */}
      <div className="flex-1 flex flex-col max-w-5xl mx-auto w-full md:grid md:grid-cols-[1fr_320px] bg-white shadow-2xl mt-4 mb-4 rounded-xl overflow-hidden border border-zinc-200 relative">
        
        {/* Chat Interface */}
        <section className="flex flex-col h-[calc(100vh-120px)] border-r border-zinc-100">
          <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
            <h2 className="text-xl font-bold tracking-tight">Centro de Ayuda y Pedidos</h2>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-400">Agente en línea</span>
            </div>
          </div>

          <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-6 space-y-8 scroll-smooth"
          >
            {messages.length <= 1 && !isLoading && (
              <div className="space-y-6 py-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="bg-zinc-50 p-6 rounded-2xl border border-zinc-200">
                  <h3 className="text-zinc-500 font-bold text-[11px] uppercase tracking-widest mb-4">Temas frecuentes</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <ActionButton icon={<RefreshCcw size={18}/>} title="Devolución" text="Tramitar retorno de artículo" onClick={() => handleSend("Hola, quiero tramitar una devolución.")} />
                    <ActionButton icon={<Package size={18}/>} title="Estado Pedido" text="¿Dónde está mi paquete?" onClick={() => handleSend("No he recibido mi pedido.")} />
                    <ActionButton icon={<Ruler size={18}/>} title="Cambio Talla" text="No me queda bien" onClick={() => handleSend("Necesito un cambio de talla.")} />
                    <ActionButton icon={<FileText size={18}/>} title="Facturación" text="Incidencia con el pago" onClick={() => handleSend("Tengo un problema con la factura.")} />
                  </div>
                </div>
              </div>
            )}

            <AnimatePresence mode="popLayout">
              {messages.map((msg, idx) => (
                <motion.div
                  key={idx}
                  layout
                  initial={{ opacity: 0, scale: 0.98, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ type: "spring", damping: 25, stiffness: 200 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex gap-4 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm border ${
                      msg.role === 'user' ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-white border-zinc-200 text-zalando-orange'
                    }`}>
                      {msg.role === 'user' ? <User size={18} /> : <ShoppingBag size={18} />}
                    </div>
                    <div className={`shadow-sm px-5 py-3.5 rounded-3xl text-[14px] leading-relaxed relative ${
                      msg.role === 'user' 
                        ? 'bg-zinc-900 text-white rounded-tr-none' 
                        : 'bg-zinc-100 border border-zinc-200 text-zinc-900 rounded-tl-none font-medium'
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {isLoading && (
              <div className="flex justify-start animate-pulse">
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-300">
                    <ShoppingBag size={18} />
                  </div>
                  <div className="bg-zinc-50 border border-zinc-200 px-5 py-3.5 rounded-3xl rounded-tl-none flex gap-1.5 items-center">
                    <div className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce"></div>
                    <div className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                    <div className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-100 p-4 rounded-xl flex gap-3 text-red-700 animate-in zoom-in-95 duration-300">
                <AlertCircle className="shrink-0" size={20} />
                <div>
                  <p className="font-bold text-sm underline decoration-red-200 underline-offset-4 mb-1 uppercase tracking-tight">Error de Comunicación</p>
                  <p className="text-xs opacity-80">{error}</p>
                  <button onClick={() => handleSend()} className="mt-3 text-[10px] font-black uppercase bg-white px-3 py-1 rounded-md border border-red-200 hover:bg-red-50 transition-colors">Reintentar</button>
                </div>
              </div>
            )}
          </div>

          <div className="p-6 pt-2 bg-white flex flex-col gap-3">
            <div className="relative group">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Introduzca los datos de su incidencia..."
                className="w-full bg-zinc-50 border border-zinc-300 rounded-2xl px-6 py-4 pr-16 text-[15px] focus:outline-none focus:ring-2 focus:ring-zalando-orange focus:border-transparent transition-all min-h-[56px] resize-none"
                rows={1}
              />
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || isLoading}
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-zalando-orange text-white p-2.5 rounded-xl shadow-lg shadow-orange-200 disabled:opacity-30 disabled:shadow-none hover:bg-orange-600 transition-all active:scale-95"
              >
                <Send size={18} />
              </button>
            </div>
            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-[0.2em] px-2">Support Protocol Z-2026 • Zalando Customer Care</p>
          </div>
        </section>

        {/* Info Sidebar (Zalando Style) */}
        <aside className="hidden md:flex flex-col bg-zinc-50 p-8 space-y-10">
          <div>
            <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-6">Guía de soporte</h4>
            <div className="space-y-4">
              <GuideItem icon={<Package size={16}/>} text="Tenga a mano su ID de Pedido." />
              <GuideItem icon={<Truck size={16}/>} text="Las devoluciones son gratuitas." />
              <GuideItem icon={<FileText size={16}/>} text="Información protegida por SSL." />
            </div>
          </div>

          <div className="pt-10 border-t border-zinc-200">
            <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-6">Estado de su cuenta</h4>
            <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-zalando-orange/10 rounded-full flex items-center justify-center text-zalando-orange px-2 font-black italic">Z</div>
                <div>
                  <p className="font-bold text-xs uppercase">Premium User</p>
                  <p className="text-[10px] text-zinc-400">Verificado</p>
                </div>
              </div>
              <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                <div className="bg-zalando-orange h-full w-[80%]"></div>
              </div>
              <p className="text-[9px] mt-2 font-bold text-zinc-500 uppercase tracking-tight">Nivel de lealtad: 80%</p>
            </div>
          </div>
        </aside>
      </div>

      <footer className="p-6 text-center">
        <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-[0.3em]">Zalando SE • Estándares de Servicio Premium</p>
      </footer>
    </div>
  );
}

function ActionButton({ icon, title, text, onClick }: { icon: React.ReactNode, title: string, text: string, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="bg-white p-4 rounded-xl border border-zinc-200 text-left hover:border-zalando-orange hover:shadow-md transition-all group flex gap-3 h-full items-start"
    >
      <div className="text-zalando-orange p-2 bg-orange-50 rounded-lg group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <div>
        <h4 className="font-bold text-[13px] text-zinc-900 group-hover:text-zalando-orange transition-colors">{title}</h4>
        <p className="text-[11px] text-zinc-500 mt-0.5 font-medium leading-tight">{text}</p>
      </div>
      <ChevronRight size={14} className="ml-auto self-center text-zinc-300 group-hover:text-zalando-orange transition-colors" />
    </button>
  );
}

function GuideItem({ icon, text }: { icon: React.ReactNode, text: string }) {
  return (
    <div className="flex items-center gap-3 text-zinc-600">
      <div className="text-zinc-400 bg-zinc-200/50 p-2 rounded-lg">{icon}</div>
      <p className="text-[12px] font-bold tracking-tight">{text}</p>
    </div>
  );
}
