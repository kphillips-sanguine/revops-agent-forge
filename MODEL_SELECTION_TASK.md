# Model Selection Feature

## Overview
Add multi-model support to AgentForge. Users should be able to select which LLM model an agent uses. The app should recommend a model based on the agent's complexity.

## Supported Models
1. **Claude Sonnet** (`claude-sonnet-4-20250514`) — Anthropic — already integrated
2. **Gemini Pro 2.5** (`gemini-2.5-pro-preview-06-05`) — Google
3. **Gemini Flash** (`gemini-2.5-flash-preview-05-20`) — Google

## Backend Changes

### 1. Add Google Gemini dependency
In `requirements.txt`, add:
```
google-genai==1.14.0
```

### 2. Add config for Gemini API key
In `app/config.py`, add:
```python
GOOGLE_API_KEY: str = ""
```

In `.env` and `.env.example`, add:
```
GOOGLE_API_KEY=
```

### 3. Create a model registry (`app/runtime/models.py`)
```python
"""Model registry — defines available LLM models and their capabilities."""

from dataclasses import dataclass

@dataclass
class ModelInfo:
    id: str                    # Internal identifier
    display_name: str          # UI display name
    provider: str              # "anthropic" | "google"
    model_id: str              # API model identifier
    max_tokens: int            # Max output tokens
    cost_per_1k_input: float   # Cost per 1K input tokens (USD)
    cost_per_1k_output: float  # Cost per 1K output tokens (USD)
    supports_tools: bool       # Whether model supports tool calling
    recommended_for: str       # Brief description of ideal use case
    complexity_tier: str       # "simple" | "moderate" | "complex"

AVAILABLE_MODELS: dict[str, ModelInfo] = {
    "claude-sonnet": ModelInfo(
        id="claude-sonnet",
        display_name="Claude Sonnet 4",
        provider="anthropic",
        model_id="claude-sonnet-4-20250514",
        max_tokens=8192,
        cost_per_1k_input=0.003,
        cost_per_1k_output=0.015,
        supports_tools=True,
        recommended_for="Complex multi-step agents with tool use, nuanced reasoning",
        complexity_tier="complex",
    ),
    "gemini-pro": ModelInfo(
        id="gemini-pro",
        display_name="Gemini 2.5 Pro",
        provider="google",
        model_id="gemini-2.5-pro-preview-06-05",
        max_tokens=8192,
        cost_per_1k_input=0.00125,
        cost_per_1k_output=0.01,
        supports_tools=True,
        recommended_for="Complex reasoning tasks, long context, cost-effective alternative to Sonnet",
        complexity_tier="complex",
    ),
    "gemini-flash": ModelInfo(
        id="gemini-flash",
        display_name="Gemini 2.5 Flash",
        provider="google",
        model_id="gemini-2.5-flash-preview-05-20",
        max_tokens=8192,
        cost_per_1k_input=0.00015,
        cost_per_1k_output=0.0006,
        supports_tools=True,
        recommended_for="Simple agents, high-volume tasks, fast execution, lowest cost",
        complexity_tier="simple",
    ),
}

DEFAULT_MODEL = "claude-sonnet"

def get_model(model_id: str) -> ModelInfo | None:
    return AVAILABLE_MODELS.get(model_id)

def recommend_model(agent_md: str) -> dict:
    """Analyze agent definition complexity and recommend a model.
    
    Returns dict with recommended_model_id, reason, and complexity_score.
    
    Complexity scoring:
    - Number of tools (more tools = more complex)
    - Number of steps in instructions
    - Has decision logic?
    - Has complex schedule (cron vs manual)?
    - Has sensitive/write tier tools?
    - Length of definition
    """
    score = 0
    reasons = []
    
    lines = agent_md.lower()
    
    # Tool count
    tool_count = lines.count("- **") # rough count of tools section items
    if tool_count >= 4:
        score += 3
        reasons.append(f"{tool_count}+ tools referenced")
    elif tool_count >= 2:
        score += 1
    
    # Steps count
    import re
    steps = re.findall(r'^\d+\.', agent_md, re.MULTILINE)
    if len(steps) >= 6:
        score += 3
        reasons.append(f"{len(steps)} instruction steps")
    elif len(steps) >= 3:
        score += 1
    
    # Decision logic
    if "### decision logic" in lines:
        score += 2
        reasons.append("Has decision logic")
    
    # Schedule complexity
    if "cron" in lines or "event" in lines:
        score += 1
    
    # Sensitive/write tools
    if "sensitive" in lines or "sf_record_update" in lines:
        score += 2
        reasons.append("Uses write/sensitive tools")
    
    # Definition length
    if len(agent_md) > 2000:
        score += 1
    if len(agent_md) > 4000:
        score += 1
    
    # Map score to recommendation
    if score >= 5:
        model_id = "claude-sonnet"
        complexity = "complex"
        reason = "Complex agent — Claude Sonnet provides the best reasoning for multi-step workflows with tool use."
    elif score >= 2:
        model_id = "gemini-pro"
        complexity = "moderate"
        reason = "Moderate complexity — Gemini Pro offers strong reasoning at lower cost."
    else:
        model_id = "gemini-flash"
        complexity = "simple"
        reason = "Simple agent — Gemini Flash is fast and cost-effective for straightforward tasks."
    
    if reasons:
        reason += f" (Factors: {', '.join(reasons)})"
    
    return {
        "recommended_model_id": model_id,
        "complexity": complexity,
        "complexity_score": score,
        "reason": reason,
    }
```

### 4. Create Gemini client wrapper (`app/runtime/gemini_client.py`)
Create a wrapper that makes Gemini's tool-calling work similarly to Anthropic's in the executor.

Use the `google-genai` SDK (NOT `google-generativeai` or vertexai):
```python
from google import genai
from google.genai import types

client = genai.Client(api_key=settings.GOOGLE_API_KEY)

# For tool calling, convert our Claude tool format to Gemini format:
# Gemini uses types.FunctionDeclaration for tools
# The tool-calling loop is similar: check response for function calls,
# execute them, send results back.
```

### 5. Modify the executor (`app/runtime/executor.py`)
- Accept a `model_id` parameter (default: "claude-sonnet")
- Look up the model in the registry
- If provider is "anthropic", use existing Anthropic client code
- If provider is "google", use the new Gemini client
- Both should produce the same output format

### 6. Modify the builder service (`app/services/builder_service.py`)
- The builder always uses Claude Sonnet (it's generating markdown, needs best quality)
- But add model_id to the generated Agent MD under Metadata section:
  ```
  ## Metadata
  - **Model:** gemini-flash
  ```
- Builder should include a model recommendation in its response

### 7. Add API endpoints
Add to existing routers or create new router `app/routers/models.py`:
- `GET /api/models` — list available models with details
- `POST /api/models/recommend` — takes `definition_md` string, returns recommendation

### 8. Update agent schemas
In `app/schemas/` (wherever agent schemas are), add:
- `model_id: str | None = None` field to agent create/update payloads

### 9. Update execution service
- Read `model_id` from agent definition metadata or agent record
- Pass it to the executor

## Frontend Changes

### 1. Add model types (`src/types/model.ts`)
```typescript
export interface ModelInfo {
  id: string;
  display_name: string;
  provider: 'anthropic' | 'google';
  cost_per_1k_input: number;
  cost_per_1k_output: number;
  supports_tools: boolean;
  recommended_for: string;
  complexity_tier: 'simple' | 'moderate' | 'complex';
}

export interface ModelRecommendation {
  recommended_model_id: string;
  complexity: 'simple' | 'moderate' | 'complex';
  complexity_score: number;
  reason: string;
}
```

### 2. Add model API client (`src/api/models.ts`)
```typescript
export async function getModels(): Promise<ModelInfo[]> { ... }
export async function getRecommendation(definition_md: string): Promise<ModelRecommendation> { ... }
```

### 3. Create ModelSelector component (`src/components/ModelSelector.tsx`)
A dropdown/card selector showing available models with:
- Model name and provider icon (Anthropic logo / Google logo — just text labels fine)
- Cost indicator ($ / $$ / $$$)
- Brief description
- A "Recommended" badge when the recommendation matches
- Show the recommendation reason as a tooltip or small text

Style: dark theme, amber accent (#F59E0B) for selected/recommended state. Use existing Tailwind classes from the project.

### 4. Add ModelSelector to Agent Detail page
In the agent detail/edit view, add the ModelSelector above or near the Monaco editor.
When the user selects a model, update the Agent MD metadata section.
Show the recommendation after the MD is parsed.

### 5. Add ModelSelector to Builder page  
In the Builder, after an agent definition is generated:
- Auto-run the recommendation
- Show the ModelSelector with the recommendation pre-selected
- User can override

### 6. Mock data fallback
Add mock data for models (hardcoded list matching the backend) so the frontend works without the API, same pattern as existing mock fallback.

## Agent type definition
Add `model_id?: string` to the `Agent` interface and `AgentCreatePayload`/`AgentUpdatePayload` in `src/types/agent.ts`.

## Database Changes
None needed — model_id can be stored in the `definition_md` metadata section. The MD parser already extracts metadata.

## Docker/Compose Changes
- Add `GOOGLE_API_KEY` to `docker-compose.yml` environment section
- Add `GOOGLE_API_KEY=` to `.env.example` and `.env`

## IMPORTANT CONSTRAINTS
- Do NOT re-scaffold or overwrite files unnecessarily — only modify what's needed
- `npm run build` in `agent-platform-ui/` must pass with 0 errors and 0 warnings
- `python -m py_compile` on all changed .py files must succeed
- Dark theme with amber accent (#F59E0B) — match existing UI style
- Keep the mock data fallback pattern (try API, catch → use mock)
- The builder service itself should ALWAYS use Claude Sonnet (best quality for generating agent definitions). The model selector is for the agent's EXECUTION model.
- ValidationResult uses `.status` not `.severity`
