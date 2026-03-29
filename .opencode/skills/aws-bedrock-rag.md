# AWS Bedrock + RAG over S3 Vectors Skill

## Overview

Integration with AWS Bedrock for managed LLM access and Retrieval-Augmented Generation (RAG) using Amazon S3 Vectors as the vector store.

---

## AWS Services

| Service | Role |
|---------|------|
| **Amazon Bedrock** | Managed LLM hosting (Claude, Llama, Titan, etc.) |
| **Amazon S3 Vectors** | Native vector storage and similarity search in S3 |
| **Amazon OpenSearch** (alternative) | If advanced vector search features needed |
| **AWS IAM** | Access control for all services |
| **Amazon CloudWatch** | Logging and monitoring |

---

## Amazon Bedrock

### Available Models (via LiteLLM or direct SDK)

| Model | Model ID | Use Case |
|-------|----------|----------|
| Claude 3.5 Sonnet | `anthropic.claude-3-5-sonnet-20241022-v2:0` | General reasoning, code, analysis |
| Claude 3 Haiku | `anthropic.claude-3-haiku-20240307-v1:0` | Fast, cheap, classification |
| Claude 3 Opus | `anthropic.claude-3-opus-20240229-v1:0` | Complex reasoning, highest quality |
| Llama 3.1 70B | `meta.llama3-1-70b-instruct-v1:0` | Open-source alternative |
| Titan Text | `amazon.titan-text-premier-v1:0` | AWS-native, cost-effective |
| Titan Embeddings | `amazon.titan-embed-text-v2:0` | Embedding generation for RAG |

### Calling via LiteLLM

```python
import litellm

response = await litellm.acompletion(
    model="bedrock/anthropic.claude-3-5-sonnet-20241022-v2:0",
    messages=[{"role": "user", "content": "Summarize this document..."}],
    temperature=0.3,
    max_tokens=4096,
    aws_region_name="us-east-1",
)
```

### Calling via boto3 (direct)

```python
import boto3
import json

bedrock = boto3.client("bedrock-runtime", region_name="us-east-1")

response = bedrock.invoke_model(
    modelId="anthropic.claude-3-5-sonnet-20241022-v2:0",
    contentType="application/json",
    accept="application/json",
    body=json.dumps({
        "anthropic_version": "bedrock-2023-05-31",
        "max_tokens": 4096,
        "messages": [{"role": "user", "content": "Hello"}],
    }),
)
```

### Streaming

```python
response = bedrock.invoke_model_with_response_stream(
    modelId="anthropic.claude-3-5-sonnet-20241022-v2:0",
    body=json.dumps({ ... }),
)
for event in response.get("body"):
    chunk = json.loads(event["chunk"]["bytes"])
    # process chunk
```

---

## Amazon S3 Vectors (Vector Store)

### What is S3 Vectors

Amazon S3 Vectors is a native vector storage capability within S3 that allows storing, indexing, and querying vector embeddings directly in S3 buckets. It eliminates the need for a separate vector database for many RAG use cases.

### Key Concepts

- **Vector Bucket**: S3 bucket with vector capabilities enabled.
- **Vector Index**: Named index within a bucket, configured with dimension and distance metric.
- **Vectors**: Individual embedding records with metadata.

### Creating a Vector Index

```python
import boto3

s3vectors = boto3.client("s3vectors", region_name="us-east-1")

# Create a vector index
s3vectors.create_index(
    vectorBucketName="my-rag-vectors",
    indexName="documents-index",
    dataType="float32",
    dimension=1536,  # Titan Embeddings v2 dimension
    distanceMetric="cosine",
)
```

### Inserting Vectors

```python
s3vectors.put_vectors(
    vectorBucketName="my-rag-vectors",
    indexName="documents-index",
    vectors=[
        {
            "key": "doc-001-chunk-0",
            "data": {"float32": embedding_list},  # list of 1536 floats
            "metadata": {
                "source": "handbook.pdf",
                "chunk_index": 0,
                "text": "This is the chunk text...",
                "page": 12,
            },
        },
        # ... more vectors
    ],
)
```

### Querying Vectors (Similarity Search)

```python
results = s3vectors.query_vectors(
    vectorBucketName="my-rag-vectors",
    indexName="documents-index",
    queryVector={"float32": query_embedding},
    topK=5,
    returnDistance=True,
    returnMetadata=True,
)

for match in results["vectors"]:
    print(match["metadata"]["text"])
    print(match["distance"])
```

### Deleting Vectors

```python
s3vectors.delete_vectors(
    vectorBucketName="my-rag-vectors",
    indexName="documents-index",
    keys=["doc-001-chunk-0", "doc-001-chunk-1"],
)
```

---

## RAG Pipeline

### Architecture

```
Document Ingestion:
  PDF/DOCX/TXT
    -> Chunking
    -> Embedding (Titan Embeddings v2 via Bedrock)
    -> Store in S3 Vectors

Query Flow:
  User Question
    -> Embed query (Titan Embeddings)
    -> Similarity search in S3 Vectors
    -> Retrieve top-K chunks
    -> Build augmented prompt
    -> Generate answer (Claude via Bedrock)
    -> Return with citations
```

### Embedding Service

```python
import boto3
import json

class EmbeddingService:
    def __init__(self, region: str = "us-east-1"):
        self.client = boto3.client("bedrock-runtime", region_name=region)
        self.model_id = "amazon.titan-embed-text-v2:0"

    async def embed(self, text: str) -> list[float]:
        response = self.client.invoke_model(
            modelId=self.model_id,
            contentType="application/json",
            accept="application/json",
            body=json.dumps({"inputText": text}),
        )
        body = json.loads(response["body"].read())
        return body["embedding"]

    async def embed_batch(self, texts: list[str]) -> list[list[float]]:
        # Titan supports single input; batch with asyncio.gather
        tasks = [self.embed(t) for t in texts]
        return await asyncio.gather(*tasks)
```

### Document Chunking

```python
from dataclasses import dataclass

@dataclass
class Chunk:
    text: str
    metadata: dict
    index: int

def chunk_document(
    text: str,
    chunk_size: int = 512,
    overlap: int = 64,
    metadata: dict | None = None,
) -> list[Chunk]:
    """Split text into overlapping chunks by token estimate."""
    words = text.split()
    chunks = []
    start = 0
    idx = 0

    while start < len(words):
        end = min(start + chunk_size, len(words))
        chunk_text = " ".join(words[start:end])
        chunks.append(Chunk(
            text=chunk_text,
            metadata={**(metadata or {}), "chunk_index": idx},
            index=idx,
        ))
        start += chunk_size - overlap
        idx += 1

    return chunks
```

### Ingestion Pipeline

```python
class IngestionPipeline:
    def __init__(
        self,
        embedding: EmbeddingService,
        vector_store: VectorStore,
    ):
        self.embedding = embedding
        self.vector_store = vector_store

    async def ingest(self, document_id: str, text: str, metadata: dict):
        chunks = chunk_document(text, metadata={"doc_id": document_id, **metadata})
        embeddings = await self.embedding.embed_batch([c.text for c in chunks])
        
        vectors = []
        for chunk, emb in zip(chunks, embeddings):
            vectors.append({
                "key": f"{document_id}-chunk-{chunk.index}",
                "data": {"float32": emb},
                "metadata": {
                    "text": chunk.text,
                    **chunk.metadata,
                },
            })
        
        await self.vector_store.upsert_vectors(vectors)
```

### RAG Query Service

```python
class RAGService:
    def __init__(
        self,
        embedding: EmbeddingService,
        vector_store: VectorStore,
        llm: LLMClient,
    ):
        self.embedding = embedding
        self.vector_store = vector_store
        self.llm = llm

    async def query(
        self,
        question: str,
        top_k: int = 5,
        model: str = "bedrock/anthropic.claude-3-5-sonnet-20241022-v2:0",
    ) -> dict:
        # 1. Embed the question
        query_embedding = await self.embedding.embed(question)

        # 2. Retrieve relevant chunks
        matches = await self.vector_store.search(
            embedding=query_embedding,
            top_k=top_k,
        )

        # 3. Build augmented prompt
        context = "\n\n---\n\n".join(
            f"[Source: {m.metadata.get('source', 'unknown')}, chunk {m.metadata.get('chunk_index', '?')}]\n{m.metadata['text']}"
            for m in matches
        )

        prompt = f"""Answer the question based on the provided context. 
If the context doesn't contain enough information, say so.
Cite your sources.

Context:
{context}

Question: {question}

Answer:"""

        # 4. Generate answer
        answer = await self.llm.complete(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=2048,
        )

        return {
            "answer": answer,
            "sources": [
                {
                    "text": m.metadata["text"][:200],
                    "source": m.metadata.get("source"),
                    "score": 1 - m.distance,  # cosine similarity
                }
                for m in matches
            ],
        }
```

---

## IAM Configuration

### Bedrock Access

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "bedrock:InvokeModel",
                "bedrock:InvokeModelWithResponseStream"
            ],
            "Resource": [
                "arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-*",
                "arn:aws:bedrock:us-east-1::foundation-model/amazon.titan-embed*"
            ]
        }
    ]
}
```

### S3 Vectors Access

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3vectors:CreateIndex",
                "s3vectors:DeleteIndex",
                "s3vectors:PutVectors",
                "s3vectors:DeleteVectors",
                "s3vectors:QueryVectors",
                "s3vectors:GetVectors"
            ],
            "Resource": "arn:aws:s3vectors:us-east-1:*:bucket/my-rag-vectors/*"
        }
    ]
}
```

---

## Configuration

```python
# app/core/config.py
from pydantic_settings import BaseSettings

class AWSConfig(BaseSettings):
    aws_region: str = "us-east-1"
    aws_access_key_id: str | None = None  # None = use IAM role
    aws_secret_access_key: str | None = None
    
    # Bedrock
    bedrock_default_model: str = "anthropic.claude-3-5-sonnet-20241022-v2:0"
    bedrock_fast_model: str = "anthropic.claude-3-haiku-20240307-v1:0"
    bedrock_embedding_model: str = "amazon.titan-embed-text-v2:0"
    
    # S3 Vectors
    vector_bucket_name: str = "my-rag-vectors"
    vector_index_name: str = "documents-index"
    vector_dimension: int = 1536
    vector_distance_metric: str = "cosine"
    
    # RAG
    rag_top_k: int = 5
    rag_chunk_size: int = 512
    rag_chunk_overlap: int = 64
    
    model_config = {"env_file": ".env"}
```

---

## Observability

- Log all Bedrock API calls: model, token usage, latency.
- Track embedding generation time and batch sizes.
- Monitor S3 Vectors query latency and index size.
- CloudWatch metrics for Bedrock: invocation count, token count, error rate.
- Alert on: embedding failures, vector store query timeouts, LLM rate limits.

---

## Cost Optimization

- Use **Haiku** for classification/routing, **Sonnet** for generation.
- Cache embeddings: same text should not be re-embedded.
- Batch embedding calls when possible.
- Set `max_tokens` appropriately (don't over-allocate).
- Monitor Bedrock spend via AWS Cost Explorer tags.
- Use S3 lifecycle policies on vector buckets if data has TTL.
