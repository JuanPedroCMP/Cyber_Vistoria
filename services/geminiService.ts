
import { GoogleGenAI } from "@google/genai";

export async function generateReportSummary(descriptions: string[]): Promise<string> {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const allDescriptions = descriptions.map((d, i) => `Item ${i+1}: ${d}`).join('\n');
  
  const prompt = `
    Baseado nas seguintes anotações de uma vistoria de imóvel, escreva um resumo conciso e profissional sobre a condição geral da propriedade. 
    Seja objetivo e destaque os pontos mais relevantes, tanto positivos quanto negativos.

    Anotações:
    ${allDescriptions}

    Resumo da Vistoria:
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Error generating summary with Gemini:", error);
    return "Não foi possível gerar o resumo. Por favor, tente novamente.";
  }
}
