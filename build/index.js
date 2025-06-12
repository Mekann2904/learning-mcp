import 'dotenv/config';
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
const NWS_API_BASE = "https://api.weather.gov";
const USER_AGENT = "weather-app/1.0";
// Create MCP server instance
const server = new McpServer({
    name: "weather",
    version: "1.0.0",
    capabilities: {
        resources: {},
        tools: {},
    },
});
// Helper function for making NWS API requests
async function makeNWSRequest(url) {
    const headers = {
        "User-Agent": USER_AGENT,
        Accept: "application/geo+json",
    };
    try {
        const response = await fetch(url, { headers });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return (await response.json());
    }
    catch (error) {
        console.error("Error making NWS request:", error);
        return null;
    }
}
// Format alert data
function formatAlert(feature) {
    const props = feature.properties;
    return [
        `Event: ${props.event || "Unknown"}`,
        `Area: ${props.areaDesc || "Unknown"}`,
        `Severity: ${props.severity || "Unknown"}`,
        `Status: ${props.status || "Unknown"}`,
        `Headline: ${props.headline || "No headline"}`,
        "---",
    ].join("\n");
}
// Register get-alerts tool
server.tool("get-alerts", "Get weather alerts for a state", {
    state: z.string().length(2).describe("Two-letter state code (e.g. CA, NY)"),
}, async ({ state }) => {
    const code = state.toUpperCase();
    const url = `${NWS_API_BASE}/alerts?area=${code}`;
    const data = await makeNWSRequest(url);
    if (!data) {
        return { content: [{ type: "text", text: "Failed to retrieve alerts data" }] };
    }
    if (data.features.length === 0) {
        return { content: [{ type: "text", text: `No active alerts for ${code}` }] };
    }
    const texts = data.features.map(formatAlert).join("\n");
    return { content: [{ type: "text", text: `Active alerts for ${code}:\n\n${texts}` }] };
});
// Register get-forecast tool
server.tool("get-forecast", "Get weather forecast for a location", {
    latitude: z.number().min(-90).max(90).describe("Latitude of the location"),
    longitude: z.number().min(-180).max(180).describe("Longitude of the location"),
}, async ({ latitude, longitude }) => {
    const pointsUrl = `${NWS_API_BASE}/points/${latitude},${longitude}`;
    const pts = await makeNWSRequest(pointsUrl);
    if (!pts?.properties.forecast) {
        return { content: [{ type: "text", text: "Failed to retrieve forecast URL" }] };
    }
    const forecastData = await makeNWSRequest(pts.properties.forecast);
    if (!forecastData) {
        return { content: [{ type: "text", text: "Failed to retrieve forecast data" }] };
    }
    const periods = forecastData.properties.periods;
    const lines = periods.map(p => [
        `${p.name}:`,
        `Temperature: ${p.temperature}°${p.temperatureUnit}`,
        `Wind: ${p.windSpeed} ${p.windDirection}`,
        `${p.shortForecast}`,
        "---",
    ].join("\n")).join("\n");
    return { content: [{ type: "text", text: `Forecast for ${latitude}, ${longitude}:\n\n${lines}` }] };
});
// Main function to start server
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Weather MCP Server running on stdio");
}
main().catch(err => {
    console.error("Fatal error in server:", err);
    process.exit(1);
});
