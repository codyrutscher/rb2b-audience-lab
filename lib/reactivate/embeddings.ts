import { featureExtraction } from "@huggingface/inference";

const HF_MODEL = "BAAI/bge-large-en-v1.5";

export const BGE_LARGE_DIMENSION = 1024;

function flattenToVector(output: (number | number[] | number[][])[]): number[] {
  const first = output?.[0];
  if (Array.isArray(first) && (first.length === 0 || typeof first[0] === "number")) {
    return first as number[];
  }
  if (Array.isArray(output) && output.length > 0 && typeof output[0] === "number") {
    return output as number[];
  }
  throw new Error("Unexpected Hugging Face embeddings response shape");
}

export async function embed(text: string): Promise<number[]> {
  const token = process.env.HUGGINGFACE_TOKEN;
  if (!token?.trim()) {
    throw new Error("HUGGINGFACE_TOKEN is required for embeddings");
  }
  const result = await featureExtraction(
    {
      accessToken: token,
      model: HF_MODEL,
      inputs: text.slice(0, 8192),
      provider: "hf-inference",
    },
    {}
  );
  return flattenToVector(result as (number | number[] | number[][])[]);
}
