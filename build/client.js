// src/client.ts
import 'dotenv/config';
import { GoogleGenAI, mcpToTool } from '@google/genai';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
async function main() {
    const mcpClient = new Client({ name: 'weather-client', version: '1.0.0' });
    await mcpClient.connect(new StdioClientTransport({
        command: 'node',
        args: ['build/index.js'],
    }));
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const res = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: 'What active alerts are there in NY?',
        config: { tools: [mcpToTool(mcpClient)] },
    });
    console.log(res.text);
    await mcpClient.close();
}
main().catch(console.error);
