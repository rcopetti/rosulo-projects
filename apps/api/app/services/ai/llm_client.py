from collections.abc import AsyncGenerator
from typing import Any

import litellm

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


class LLMClient:
    def __init__(self) -> None:
        self.model_id = settings.AWS_BEDROCK_MODEL_ID
        self.haiku_model_id = settings.AWS_BEDROCK_HAIKU_MODEL_ID
        self.max_tokens = settings.AI_MAX_TOKENS_PER_REQUEST

    async def complete(
        self,
        messages: list[dict[str, str]],
        model: str | None = None,
        max_tokens: int | None = None,
        temperature: float = 0.7,
        **kwargs: Any,
    ) -> str:
        response = await litellm.acompletion(
            model=model or self.model_id,
            messages=messages,
            max_tokens=max_tokens or self.max_tokens,
            temperature=temperature,
            **kwargs,
        )
        content = response.choices[0].message.content or ""
        logger.info(
            "llm_complete",
            model=model or self.model_id,
            tokens_used=response.usage.total_tokens if response.usage else 0,
        )
        return content

    async def complete_streaming(
        self,
        messages: list[dict[str, str]],
        model: str | None = None,
        max_tokens: int | None = None,
        temperature: float = 0.7,
        **kwargs: Any,
    ) -> AsyncGenerator[str, None]:
        response = await litellm.acompletion(
            model=model or self.model_id,
            messages=messages,
            max_tokens=max_tokens or self.max_tokens,
            temperature=temperature,
            stream=True,
            **kwargs,
        )
        async for chunk in response:
            if chunk.choices and chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content

    async def complete_with_tools(
        self,
        messages: list[dict[str, str]],
        tools: list[dict[str, Any]],
        model: str | None = None,
        max_tokens: int | None = None,
        temperature: float = 0.3,
        **kwargs: Any,
    ) -> dict[str, Any]:
        response = await litellm.acompletion(
            model=model or self.model_id,
            messages=messages,
            tools=tools,
            max_tokens=max_tokens or self.max_tokens,
            temperature=temperature,
            **kwargs,
        )
        message = response.choices[0].message
        result: dict[str, Any] = {"content": message.content or ""}
        if message.tool_calls:
            result["tool_calls"] = [
                {
                    "id": tc.id,
                    "name": tc.function.name,
                    "arguments": tc.function.arguments,
                }
                for tc in message.tool_calls
            ]
        return result

    def count_tokens(self, text: str, model: str | None = None) -> int:
        return litellm.token_counter(model=model or self.model_id, text=text)

    def get_cost(
        self,
        prompt_tokens: int,
        completion_tokens: int,
        model: str | None = None,
    ) -> float:
        return litellm.cost_calculator(
            model=model or self.model_id,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
        )
