/**
 * Quick diagnostic: check Qdrant collections, embedding, and full pipeline.
 * Usage: npx tsx scripts/diagnose.ts
 */
import { QdrantClient } from "@qdrant/js-client-rest";

const QDRANT_URL = process.env.QDRANT_URL || "https://d6533240-65d0-406e-a358-11de9d44063b.us-east-2-0.aws.cloud.qdrant.io";
const QDRANT_API_KEY = process.env.QDRANT_API_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2Nlc3MiOiJtIiwic3ViamVjdCI6ImFwaS1rZXk6ZGUwN2MwM2YtNzRiNi00ZTRkLWI5MzQtNTA0YmE3MDU5YjM0In0.9YSW_Y9bkji5njKsz2oznIscNWdckjpYNTyftgn_5tw";

async function main() {
  console.log("=== QDRANT DIAGNOSTIC ===");
  console.log("URL:", QDRANT_URL);

  const client = new QdrantClient({ url: QDRANT_URL, apiKey: QDRANT_API_KEY, checkCompatibility: false });

  // 1. List all collections
  console.log("\n--- Collections ---");
  const collectionsRes = await client.getCollections();
  console.log("Total collections:", collectionsRes.collections.length);
  for (const col of collectionsRes.collections) {
    console.log("  -", col.name);
  }

  // 2. For each expected collection, get count
  const prefix = "msmarco";
  const strategies = ["fixed", "overlap", "semantic", "structural"];
  
  for (const strategy of strategies) {
    const name = `${prefix}_${strategy}`;
    console.log(`\n--- Collection: ${name} ---`);
    try {
      const info = await client.getCollection(name);
      console.log("  Points count:", info.points_count);
      console.log("  Vector size:", JSON.stringify(info.config?.params?.vectors));
      console.log("  Status:", info.status);
    } catch (err) {
      console.log("  ERROR: Collection not found or inaccessible:", (err as Error).message);
    }
  }

  // 3. Test embedding
  console.log("\n--- Embedding Test ---");
  const EMBEDDING_API_URL = process.env.EMBEDDING_API_URL || "https://api.jina.ai/v1/embeddings";
  const EMBEDDING_API_KEY = process.env.EMBEDDING_API_KEY || "jina_1797f9cf751e42a883f9a3f5381fed6bg1cdMD6NYtEC052ooinYq00214nF";
  
  try {
    const embStart = Date.now();
    const embRes = await fetch(EMBEDDING_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${EMBEDDING_API_KEY}`,
      },
      body: JSON.stringify({
        model: "jina-embeddings-v3",
        task: "retrieval.query",
        input: ["भारत की राजधानी क्या है"],
      }),
    });
    const embData = await embRes.json();
    const embMs = Date.now() - embStart;
    
    if (embData.data && embData.data.length > 0) {
      const vec = embData.data[0].embedding;
      console.log(`  OK: Got ${vec.length}-dim vector in ${embMs}ms`);
      
      // 4. Now do a search in each collection using this vector
      console.log("\n--- Search Test (query: 'भारत की राजधानी क्या है') ---");
      for (const strategy of strategies) {
        const name = `${prefix}_${strategy}`;
        try {
          let points: any[] = [];
          if (typeof (client as any).query === "function") {
            const response = await (client as any).query(name, {
              query: vec,
              limit: 3,
              with_payload: true,
            });
            points = response.points || [];
          } else {
            points = await (client as any).search(name, {
              vector: vec,
              limit: 3,
              with_payload: true,
            });
          }
          console.log(`  [${name}] ${points.length} results`);
          for (const p of points) {
            const text = (p.payload?.text || "").substring(0, 80);
            console.log(`    score=${p.score?.toFixed(4)} text="${text}..."`);
          }
        } catch (err) {
          console.log(`  [${name}] ERROR:`, (err as Error).message);
        }
      }
    } else {
      console.log("  ERROR: Embedding returned no data:", JSON.stringify(embData).substring(0, 200));
    }
  } catch (err) {
    console.log("  ERROR:", (err as Error).message);
  }
}

main().catch(console.error);
