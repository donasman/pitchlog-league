/**
 * MCP stdio 서버 — Claude Desktop 등 외부 MCP 클라이언트가 `tools/list` · `tools/call` 로 붙는다.
 *
 * 실행: `npm run mcp` (nest build 후 `node dist/cli/mcp.js`)
 *
 * 규약:
 *   - stdout 은 JSON-RPC 전용. Nest 로거는 stderr 만 쓴다 — `logger: ['warn', 'error']`.
 *   - low-level `Server` + `setRequestHandler(ListToolsRequestSchema/CallToolRequestSchema, …)` 로 노출.
 *     `McpServer.tool()` (zod 기반) 은 쓰지 않는다 — argsSchema 는 이미 JSON Schema 로 확정돼 있다.
 *   - 반환 wrapper: `{ tool, args, asOf, data }` 를 그대로 직렬화해 `content[0].text` 로 넣는다.
 *   - `list_matches` 는 registry 가 `truncated`/`total` 을 덧붙일 수 있다.
 *   - 종료는 SIGINT/SIGTERM — stdio 는 blocking 이라 finally 로 닫으면 로컬 클라이언트가 살아있는 동안
 *     Nest context 가 조기 종료된다. ingest.ts 의 finally 패턴과 다른 점이다 (src/cli/ingest.ts:138).
 */
import { NestFactory } from '@nestjs/core';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { AppModule } from '../app.module.js';
import { AssistantToolRegistry } from '../assistant/assistant-tool.registry.js';

async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['warn', 'error'],
  });
  const registry = app.get(AssistantToolRegistry);

  const server = new Server(
    { name: 'pitchlog-assistant', version: '0.1.0' },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: registry.getAll().map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.argsSchema,
    })),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const result = await registry.call(req.params.name, req.params.arguments ?? {});
    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
  });

  const shutdown = async (): Promise<void> => {
    await app.close();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  const transport = new StdioServerTransport();
  await server.connect(transport);
  // finally 없음 — stdio 는 blocking. 종료는 SIGINT/SIGTERM.
}

await main();
