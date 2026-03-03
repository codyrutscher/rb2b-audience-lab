import { Pinecone } from "@pinecone-database/pinecone";

let client: Pinecone | null = null;

export function getPinecone(): Pinecone {
  if (!client) {
    const apiKey = process.env.PINECONE_API_KEY;
    if (!apiKey?.trim()) {
      throw new Error("PINECONE_API_KEY is required");
    }
    client = new Pinecone({ apiKey });
  }
  return client;
}

export function getPineconeIndexName(): string {
  const name = process.env.PINECONE_INDEX_NAME;
  if (!name?.trim()) {
    throw new Error("PINECONE_INDEX_NAME is required");
  }
  return name;
}
