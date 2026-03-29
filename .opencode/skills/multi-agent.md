# Multi-Agent Decision Making Layer Skill

## Overview

Architecture and patterns for building systems where multiple AI agents collaborate, delegate, and make decisions through structured orchestration.

---

## Core Concepts

### What is a Multi-Agent System

A design pattern where specialized LLM-powered agents handle distinct responsibilities, coordinated by an orchestrator that routes tasks, resolves conflicts, and aggregates results.

```
User Request
     |
     v
[Orchestrator / Router Agent]
     |
     +---> [Research Agent]     (information gathering)
     +---> [Analysis Agent]     (reasoning, evaluation)
     +---> [Code Agent]         (code generation, execution)
     +---> [Validation Agent]   (quality checks, verification)
     |
     v
[Synthesizer] --> Final Response
```

---

## Architecture Patterns

### Pattern 1: Orchestrator-Worker

A single router agent classifies the task and delegates to the best specialist agent.

```
Orchestrator receives input
  -> Classifies intent
  -> Selects specialist agent
  -> Passes task + context
  -> Receives result
  -> Returns or chains to next agent
```

**Use when:** Tasks are well-defined and map cleanly to specialist domains.

### Pattern 2: Pipeline (Sequential)

Agents execute in a fixed sequence, each enriching or transforming the output of the previous.

```
Input -> Agent A -> Agent B -> Agent C -> Output
```

**Use when:** Tasks have clear sequential dependencies (e.g., research -> draft -> review -> polish).

### Pattern 3: Debate / Consensus

Multiple agents analyze the same problem from different perspectives, a judge agent synthesizes.

```
       +--> Agent A (optimist) --+
Input -+--> Agent B (critic)  ---+--> Judge Agent --> Final Decision
       +--> Agent C (domain)  --+
```

**Use when:** High-stakes decisions requiring diverse viewpoints.

### Pattern 4: Hierarchical

A manager agent spawns sub-agents dynamically, collects results.

```
Manager Agent
  |-- Sub-agent 1 (spawned dynamically)
  |-- Sub-agent 2 (spawned dynamically)
  |-- Sub-agent 3 (spawned dynamically)
  |
  +-- Aggregates all results
```

**Use when:** Task decomposition is not predictable ahead of time.

---

## Implementation Architecture

### Project Structure

```
app/
  agents/
    base.py              # BaseAgent abstract class
    orchestrator.py      # Router/orchestrator agent
    research_agent.py    # Research specialist
    code_agent.py        # Code generation specialist
    validator_agent.py   # Quality assurance agent
    registry.py          # Agent registration and discovery
  tools/
    base.py              # BaseTool abstract class
    search_tool.py       # Web/document search
    code_exec_tool.py    # Sandboxed code execution
    db_tool.py           # Database query tool
    registry.py          # Tool registration
  memory/
    short_term.py        # Conversation context buffer
    long_term.py         # Persistent memory (PostgreSQL/Vector store)
    shared_state.py      # Inter-agent state bus
  orchestration/
    router.py            # Task classification and routing
    pipeline.py          # Sequential chain execution
    consensus.py         # Multi-agent debate coordinator
    state_machine.py     # Agent workflow state management
```

### Base Agent

```python
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from enum import Enum
from typing import Any

class AgentStatus(Enum):
    IDLE = "idle"
    RUNNING = "running"
    DONE = "done"
    FAILED = "failed"

@dataclass
class AgentResult:
    agent_name: str
    output: str
    confidence: float  # 0.0 - 1.0
    metadata: dict[str, Any] = field(default_factory=dict)
    tokens_used: int = 0

class BaseAgent(ABC):
    name: str
    description: str
    tools: list[str]  # registered tool names this agent can use

    @abstractmethod
    async def run(self, task: str, context: dict[str, Any]) -> AgentResult:
        """Execute agent logic and return structured result."""
        ...

    @abstractmethod
    def can_handle(self, task: str) -> float:
        """Return confidence score (0-1) for handling this task."""
        ...
```

### Orchestrator

```python
class Orchestrator:
    def __init__(self, agents: list[BaseAgent], llm_client: LLMClient):
        self.agents = agents
        self.llm = llm_client

    async def route(self, task: str, context: dict) -> AgentResult:
        # Score each agent's ability to handle the task
        scores = [(a, a.can_handle(task)) for a in self.agents]
        scores.sort(key=lambda x: x[1], reverse=True)

        best_agent, confidence = scores[0]
        if confidence < 0.3:
            # No agent confident enough; use LLM to decide
            best_agent = await self._llm_route(task)

        return await best_agent.run(task, context)

    async def _llm_route(self, task: str) -> BaseAgent:
        agent_descriptions = "\n".join(
            f"- {a.name}: {a.description}" for a in self.agents
        )
        prompt = f"""Given the task below, select the best agent.
        
Available agents:
{agent_descriptions}

Task: {task}

Respond with ONLY the agent name."""
        
        selected = await self.llm.complete(
            model="bedrock/claude-sonnet",
            messages=[{"role": "user", "content": prompt}],
            temperature=0,
        )
        return next(a for a in self.agents if a.name == selected.strip())
```

---

## Inter-Agent Communication

### Shared State Bus

```python
from dataclasses import dataclass, field
from typing import Any

@dataclass
class SharedState:
    """Thread-safe shared context between agents in a workflow."""
    user_input: str
    conversation_history: list[dict] = field(default_factory=list)
    agent_outputs: dict[str, AgentResult] = field(default_factory=dict)
    artifacts: dict[str, Any] = field(default_factory=dict)  # files, data, etc.
    decisions: list[dict] = field(default_factory=list)

    def get_output(self, agent_name: str) -> AgentResult | None:
        return self.agent_outputs.get(agent_name)

    def set_output(self, result: AgentResult):
        self.agent_outputs[result.agent_name] = result
```

### Message Protocol

```python
from enum import Enum

class MessageType(Enum):
    TASK = "task"              # Assign work
    RESULT = "result"          # Return work result
    QUERY = "query"            # Ask another agent for info
    RESPONSE = "response"      # Answer a query
    ESCALATE = "escalate"      # Cannot handle, escalate to orchestrator
    APPROVE = "approve"        # Approval in review workflows
    REJECT = "reject"          # Rejection in review workflows

@dataclass
class AgentMessage:
    type: MessageType
    sender: str
    recipient: str
    content: str
    metadata: dict[str, Any] = field(default_factory=dict)
```

---

## Tool System

Agents interact with external systems through tools, not direct integration.

```python
class BaseTool(ABC):
    name: str
    description: str

    @abstractmethod
    async def execute(self, **kwargs) -> dict[str, Any]:
        ...

class ToolRegistry:
    def __init__(self):
        self._tools: dict[str, BaseTool] = {}

    def register(self, tool: BaseTool):
        self._tools[tool.name] = tool

    def get(self, name: str) -> BaseTool:
        return self._tools[name]

    def available_for_agent(self, agent: BaseAgent) -> list[BaseTool]:
        return [self._tools[t] for t in agent.tools if t in self._tools]
```

### Tool Manifest (for LLM function calling)

```python
def to_openai_functions(tools: list[BaseTool]) -> list[dict]:
    return [
        {
            "type": "function",
            "function": {
                "name": t.name,
                "description": t.description,
                "parameters": t.get_schema(),
            },
        }
        for t in tools
    ]
```

---

## Memory Architecture

### Short-Term (In-Session)

- Conversation buffer with sliding window (last N turns).
- Current workflow state.
- In-memory, lost on restart.

### Long-Term (Persistent)

- Vector store of past interactions, decisions, and outcomes.
- Stored in PostgreSQL + pgvector or S3 Vectors.
- Retrieved via semantic search to inform agent decisions.

```python
class LongTermMemory:
    def __init__(self, vector_store):
        self.store = vector_store

    async def recall(self, query: str, top_k: int = 5) -> list[dict]:
        embedding = await embed(query)
        return await self.store.search(embedding, top_k=top_k)

    async def remember(self, content: str, metadata: dict):
        embedding = await embed(content)
        await self.store.upsert(embedding, content, metadata)
```

---

## Decision Making Patterns

### Confidence-Based Routing

Each agent returns a confidence score. If below threshold, escalate or use fallback.

### Voting / Consensus

Multiple agents vote on a decision. Majority wins or weighted by historical accuracy.

```python
async def consensus_decision(
    agents: list[BaseAgent],
    task: str,
    context: dict,
    llm: LLMClient,
) -> str:
    results = await asyncio.gather(
        *[a.run(task, context) for a in agents]
    )
    # Weighted vote by confidence
    votes: dict[str, float] = {}
    for r in results:
        votes[r.output] = votes.get(r.output, 0) + r.confidence
    
    return max(votes, key=votes.get)
```

### Review / Critique Loop

Agent produces output, another agent critiques, original agent revises (max N iterations).

```python
async def review_loop(
    producer: BaseAgent,
    reviewer: BaseAgent,
    task: str,
    max_iterations: int = 3,
) -> AgentResult:
    context = {}
    for i in range(max_iterations):
        result = await producer.run(task, context)
        review = await reviewer.run(
            f"Review this output for correctness and completeness:\n{result.output}",
            context,
        )
        if review.confidence > 0.9:
            return result
        context["feedback"] = review.output
    return result  # return best after max iterations
```

---

## Observability

- Log every agent invocation: input, output, duration, tokens, confidence.
- Trace IDs linking all agents in a single workflow execution.
- Metrics: per-agent latency, success rate, token spend.
- Store decision rationale in long-term memory for audit.

```python
import structlog

logger = structlog.get_logger()

async def traced_run(agent: BaseAgent, task: str, context: dict) -> AgentResult:
    logger.info("agent.start", agent=agent.name, task_preview=task[:100])
    start = time.time()
    result = await agent.run(task, context)
    duration = time.time() - start
    logger.info(
        "agent.complete",
        agent=agent.name,
        duration=duration,
        tokens=result.tokens_used,
        confidence=result.confidence,
    )
    return result
```

---

## Guardrails

- **Max iterations**: Prevent infinite loops in review cycles.
- **Token budgets**: Per-workflow and per-agent token limits.
- **Timeout**: Each agent has a max execution time.
- **Output validation**: Schema validation on agent outputs before passing downstream.
- **Human-in-the-loop**: Escalation hooks for low-confidence or high-stakes decisions.
