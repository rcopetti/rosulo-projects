# LiteLLM AI Integration Skill

## Overview

Unified LLM integration layer using LiteLLM as a proxy/SDK to abstract multiple LLM providers behind a single OpenAI-compatible interface.

---

## What is LiteLLM

LiteLLM is a library/proxy that provides a unified API to call 100+ LLM providers (OpenAI, Anthropic, AWS Bedrock, Azure, Cohere, etc.) using the OpenAI API format. It handles routing, fallbacks, retries, spend tracking, and rate limiting.

---

## Integration Patterns

### Pattern 1: LiteLLM as Python SDK (in-process)

Use directly in Python backend code.

```python
import litellm

response = await litellm.acompletion(
    model="bedrock/anthropic.claude-3-sonnet-20240229-v1:0",
    messages=[{"role": "user", "content": "Hello"}],
    temperature=0.7,
    max_tokens=1024,
)
```

### Pattern 2: LiteLLM as Proxy Server (out-of-process)

Run LiteLLM as a standalone proxy; backend calls it via HTTP.

```
Backend (FastAPI) --> LiteLLM Proxy (port 4000) --> Bedrock / OpenAI / etc.
```

```yaml
# litellm_config.yaml
model_list:
  - model_name: claude-sonnet
    litellm_params:
      model: bedrock/anthropic.claude-3-sonnet-20240229-v1:0
      aws_region_name: us-east-1
  - model_name: gpt-4o
    litellm_params:
      model: openai/gpt-4o
      api_key: os.environ/OPENAI_API_KEY

general_settings:
  master_key: sk-litellm-master
  database_url: postgresql://user:pass@localhost/litellm
```

**When to use which:**
- SDK: Simple apps, single service, minimal routing needs.
- Proxy: Multi-service architectures, centralized spend tracking, team sharing.

---

## Configuration

### Environment Variables

```bash
# Provider keys (set only what you use)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION_NAME=us-east-1

# LiteLLM settings
LITELLM_LOG=INFO                    # DEBUG for verbose logging
LITELLM_REQUEST_TIMEOUT=60          # seconds
LITELLM_NUM_RETRIES=3               # retry on transient failures
LITELLM_DROP_PARAMS=true            # drop unsupported params per provider
```

### Model Routing

```python
import litellm

# Configure fallback chain
litellm.set_verbose = False

response = await litellm.acompletion(
    model="claude-sonnet",  # resolved via proxy config
    messages=messages,
    # Fallback chain (if primary fails, try next)
    fallbacks=["bedrock/anthropic.claude-3-haiku-20240307-v1:0"],
)
```

---

## Coding Conventions

### LLM Client Wrapper

Centralize all LLM calls in a dedicated service. No direct `litellm` calls in route handlers.

```python
# app/services/llm_client.py
import litellm
from app.core.config import settings

class LLMClient:
    def __init__(self):
        litellm.num_retries = 3
        litellm.request_timeout = 60
        litellm.drop_params = True

    async def complete(
        self,
        model: str,
        messages: list[dict],
        temperature: float = 0.7,
        max_tokens: int = 1024,
        **kwargs,
    ) -> str:
        response = await litellm.acompletion(
            model=model,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
            **kwargs,
        )
        return response.choices[0].message.content

    async def complete_streaming(
        self,
        model: str,
        messages: list[dict],
        **kwargs,
    ):
        response = await litellm.acompletion(
            model=model,
            messages=messages,
            stream=True,
            **kwargs,
        )
        async for chunk in response:
            delta = chunk.choices[0].delta.content
            if delta:
                yield delta

llm = LLMClient()
```

### Streaming Responses (FastAPI)

```python
from fastapi.responses import StreamingResponse

@router.post("/chat")
async def chat(payload: ChatRequest):
    async def generate():
        async for chunk in llm.complete_streaming(
            model="claude-sonnet",
            messages=payload.messages,
        ):
            yield f"data: {chunk}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")
```

### Token Counting

```python
import litellm

def count_tokens(messages: list[dict], model: str) -> int:
    return litellm.token_counter(model=model, messages=messages)
```

### Cost Tracking

```python
import litellm

response = await litellm.acompletion(model="bedrock/claude-sonnet", messages=messages)
cost = litellm.completion_cost(completion_response=response)
# cost in USD
```

---

## Model Naming Convention

LiteLLM uses `{provider}/{model_id}` format:

| Provider | Model String |
|----------|-------------|
| AWS Bedrock | `bedrock/anthropic.claude-3-sonnet-20240229-v1:0` |
| AWS Bedrock | `bedrock/anthropic.claude-3-haiku-20240307-v1:0` |
| OpenAI | `openai/gpt-4o` |
| OpenAI | `openai/gpt-4o-mini` |
| Anthropic direct | `claude-3-sonnet-20240229` |
| Ollama (local) | `ollama/llama3` |

---

## Error Handling

```python
import litellm
from litellm import (
    RateLimitError,
    ServiceUnavailableError,
    Timeout,
    APIError,
)

async def safe_complete(model: str, messages: list[dict]) -> str:
    try:
        return await llm.complete(model=model, messages=messages)
    except RateLimitError:
        # Backoff and retry is handled by litellm internally
        raise
    except ServiceUnavailableError:
        # Fallback to alternative model
        return await llm.complete(model="bedrock/claude-haiku", messages=messages)
    except Timeout:
        raise AppError(code="LLM_TIMEOUT", status=504)
    except APIError as e:
        raise AppError(code="LLM_ERROR", status=502, detail=str(e))
```

---

## Observability

### Logging

```python
import litellm
import logging

litellm.set_verbose = True  # logs all requests/responses
litellm.success_callback = ["langfuse"]  # optional: send to observability platform
litellm.failure_callback = ["langfuse"]
```

### Callbacks

Integrate with Langfuse, Helicone, or custom logging:

```python
import litellm

def custom_logger(kwargs, completion_response, start_time, end_time):
    latency = (end_time - start_time).total_seconds()
    model = kwargs["model"]
    tokens = completion_response.usage.total_tokens
    log.info(f"LLM call: model={model} tokens={tokens} latency={latency:.2f}s")

litellm.success_callback.append(custom_logger)
```

---

## Security

- Never log full prompts/responses containing PII.
- Rotate API keys via environment variables, not code.
- Use LiteLLM proxy virtual keys for team access (centralized revocation).
- Set budget limits per key via proxy config.
- Input sanitization: strip/escape user content before sending to LLM.

---

## Testing

- Mock `litellm.acompletion` in unit tests.
- Record/replay cassettes for integration tests.
- Test fallback behavior by injecting failures.
- Validate token counting accuracy in CI.
