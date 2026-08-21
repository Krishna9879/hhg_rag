import { QdrantClient } from "@qdrant/js-client-rest";

async function main() {
  const client = new QdrantClient({
    url: process.env.QDRANT_URL || "https://d6533240-65d0-406e-a358-11de9d44063b.us-east-2-0.aws.cloud.qdrant.io",
    apiKey: process.env.QDRANT_API_KEY,
    checkCompatibility: false,
  });
  const res = await client.getCollections();
  console.log("Qdrant Collections:", res.collections.map((c) => c.name));
}

main().catch(console.error);
