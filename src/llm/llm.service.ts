// src/llm/llm.service.ts
import { Injectable } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class LlmService {
  private gen = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
  private model = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

  async generateText(prompt: string): Promise<string> {
    const res = await this.gen.getGenerativeModel({ model: this.model }).generateContent(prompt);
    return res.response.text();
  }

  async generateJson(prompt: string): Promise<any> {
    const text = await this.generateText(`${prompt}\n\nRESPONDE SOLO JSON VÁLIDO.`);
    const cleaned = text.trim().replace(/^```json/i, '').replace(/```$/i, '').trim();
    try { return JSON.parse(cleaned); } catch { return { _raw: text }; }
  }
}
