import https from "https";
import http from "http";
import { performance } from "perf_hooks";

interface TimingBreakdown {
  dnsMs: number;
  tcpMs: number;
  tlsMs: number;
  ttfbMs: number;
  totalMs: number;
}

function measureHttpsLatency(targetUrl: string, method: string = "GET", headers: Record<string, string> = {}, body?: string, agent?: https.Agent): Promise<TimingBreakdown> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(targetUrl);
    let dnsStart = 0;
    let dnsEnd = 0;
    let tcpStart = 0;
    let tcpEnd = 0;
    let tlsStart = 0;
    let tlsEnd = 0;
    let reqStart = performance.now();
    let resStart = 0;

    const req = https.request({
      hostname: parsed.hostname,
      port: parsed.port || 443,
      path: parsed.pathname + parsed.search,
      method,
      headers,
      agent,
    }, (res) => {
      resStart = performance.now();
      res.on("data", () => {});
      res.on("end", () => {
        const totalEnd = performance.now();
        resolve({
          dnsMs: Math.round(dnsEnd - dnsStart),
          tcpMs: Math.round(tcpEnd - tcpStart),
          tlsMs: Math.round(tlsEnd - tlsStart),
          ttfbMs: Math.round(resStart - reqStart),
          totalMs: Math.round(totalEnd - reqStart),
        });
      });
    });

    req.on("socket", (socket) => {
      dnsStart = performance.now();
      socket.on("lookup", () => {
        dnsEnd = performance.now();
        tcpStart = performance.now();
      });
      socket.on("connect", () => {
        tcpEnd = performance.now();
        tlsStart = performance.now();
      });
      socket.on("secureConnect", () => {
        tlsEnd = performance.now();
      });
    });

    req.on("error", reject);
    if (body) {
      req.write(body);
    }
    req.end();
  });
}

async function runNetworkDiagnostics() {
  console.log("=========================================================================");
  console.log("          NETWORK & CONNECTION OVERHEAD DIAGNOSTIC (FROM INDIA)          ");
  console.log("=========================================================================\n");

  const jinaUrl = "https://api.jina.ai/v1/embeddings";
  const qdrantUrl = "https://d6533240-65d0-406e-a358-11de9d44063b.us-east-2-0.aws.cloud.qdrant.io/collections";

  const jinaKey = process.env.EMBEDDING_API_KEY || "jina_1797f9cf751e42a883f9a3f5381fed6bg1cdMD6NYtEC052ooinYq00214nF";
  const qdrantKey = process.env.QDRANT_API_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2Nlc3MiOiJtIiwic3ViamVjdCI6ImFwaS1rZXk6ZGUwN2MwM2YtNzRiNi00ZTRkLWI5MzQtNTA0YmE3MDU5YjM0In0.9YSW_Y9bkji5njKsz2oznIscNWdckjpYNTyftgn_5tw";

  // 1. COLD CONNECTION (No agent reuse)
  console.log("1. COLD CONNECTIONS (New TCP + New TLS Handshake on every call):");
  
  const jinaCold = await measureHttpsLatency(
    jinaUrl,
    "POST",
    {
      "Content-Type": "application/json",
      Authorization: `Bearer ${jinaKey}`,
    },
    JSON.stringify({ model: "jina-embeddings-v3", task: "retrieval.query", input: ["National Bird of India"] })
  );
  console.log(`  [Jina Embed API - Cold]`);
  console.log(`    DNS: ${jinaCold.dnsMs}ms | TCP: ${jinaCold.tcpMs}ms | TLS: ${jinaCold.tlsMs}ms | TTFB: ${jinaCold.ttfbMs}ms | TOTAL: ${jinaCold.totalMs}ms`);

  const qdrantCold = await measureHttpsLatency(
    qdrantUrl,
    "GET",
    {
      "api-key": qdrantKey,
    }
  );
  console.log(`  [Qdrant Cloud (Ohio us-east-2) - Cold]`);
  console.log(`    DNS: ${qdrantCold.dnsMs}ms | TCP: ${qdrantCold.tcpMs}ms | TLS: ${qdrantCold.tlsMs}ms | TTFB: ${qdrantCold.ttfbMs}ms | TOTAL: ${qdrantCold.totalMs}ms\n`);

  // 2. WARM CONNECTION (Using persistent Keep-Alive Agent)
  console.log("2. WARM CONNECTIONS (Reusing single persistent Keep-Alive HTTPS Agent):");
  const keepAliveAgent = new https.Agent({
    keepAlive: true,
    maxSockets: 20,
    maxFreeSockets: 10,
    timeout: 30000,
  });

  // Pre-warm socket
  await measureHttpsLatency(jinaUrl, "POST", { "Content-Type": "application/json", Authorization: `Bearer ${jinaKey}` }, JSON.stringify({ model: "jina-embeddings-v3", task: "retrieval.query", input: ["warmup"] }), keepAliveAgent);
  await measureHttpsLatency(qdrantUrl, "GET", { "api-key": qdrantKey }, undefined, keepAliveAgent);

  const jinaWarm = await measureHttpsLatency(
    jinaUrl,
    "POST",
    {
      "Content-Type": "application/json",
      Authorization: `Bearer ${jinaKey}`,
    },
    JSON.stringify({ model: "jina-embeddings-v3", task: "retrieval.query", input: ["National Bird of India"] }),
    keepAliveAgent
  );
  console.log(`  [Jina Embed API - Warm Keep-Alive]`);
  console.log(`    DNS: ${jinaWarm.dnsMs}ms | TCP: ${jinaWarm.tcpMs}ms | TLS: ${jinaWarm.tlsMs}ms | TTFB: ${jinaWarm.ttfbMs}ms | TOTAL: ${jinaWarm.totalMs}ms`);

  const qdrantWarm = await measureHttpsLatency(
    qdrantUrl,
    "GET",
    {
      "api-key": qdrantKey,
    },
    undefined,
    keepAliveAgent
  );
  console.log(`  [Qdrant Cloud (Ohio us-east-2) - Warm Keep-Alive]`);
  console.log(`    DNS: ${qdrantWarm.dnsMs}ms | TCP: ${qdrantWarm.tcpMs}ms | TLS: ${qdrantWarm.tlsMs}ms | TTFB: ${qdrantWarm.ttfbMs}ms | TOTAL: ${qdrantWarm.totalMs}ms\n`);
}

runNetworkDiagnostics().catch(console.error);
