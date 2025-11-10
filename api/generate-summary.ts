import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from "@google/genai";

// This function is the entry point for the Vercel serverless function.
export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  // 1. Check for POST method
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  // 2. Check for API Key on the server
  if (!process.env.API_KEY) {
    console.error("API_KEY environment variable not set on server.");
    return res.status(500).json({ error: { message: "Internal server configuration error." } });
  }

  try {
    // 3. Get descriptions from request body
    const { descriptions } = req.body;
    if (!Array.isArray(descriptions) || descriptions.length === 0) {
      return res.status(400).json({ error: { message: "Request body must contain a non-empty 'descriptions' array." } });
    }

    // 4. Call Gemini API (same logic as before, but now securely on the server)
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
    const allDescriptions = descriptions.map((d, i) => `Item ${i+1}: ${d}`).join('\n');
    
    const prompt = `
      Baseado nas seguintes anotações de uma vistoria de imóvel, escreva um resumo conciso e profissional sobre a condição geral da propriedade. 
      Seja objetivo e destaque os pontos mais relevantes, tanto positivos quanto negativos.

      Anotações:
      ${allDescriptions}

      Resumo da Vistoria:
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    
    const summaryText = response.text;

    // 5. Send the successful response back to the client
    return res.status(200).json({ summary: summaryText });

  } catch (error) {
    console.error("Error in /api/generate-summary:", error);
    // Avoid sending detailed internal errors to the client
    return res.status(500).json({ error: { message: "Failed to generate summary." } });
  }
}
