from pydantic import BaseModel, Field


class BuilderRequest(BaseModel):
    prompt: str = Field(..., min_length=10)
    conversation_history: list[dict] = Field(default_factory=list)
    current_definition: str | None = None
    context: dict | None = None

    model_config = {"from_attributes": True}


class BuilderResponse(BaseModel):
    definition_md: str
    explanation: str
    tools_used: list[str]
    warnings: list[str]
    suggestions: list[str]

    model_config = {"from_attributes": True}


class ValidateRequest(BaseModel):
    definition_md: str = Field(..., min_length=10)

    model_config = {"from_attributes": True}


class ValidationResult(BaseModel):
    is_valid: bool
    errors: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    suggestions: list[str] = Field(default_factory=list)

    model_config = {"from_attributes": True}


class SimulationRequest(BaseModel):
    agent_id: str | None = None
    definition_md: str | None = None
    mock_inputs: dict = Field(default_factory=dict)

    model_config = {"from_attributes": True}


class SimulationResult(BaseModel):
    status: str
    timeline: list[dict] = Field(default_factory=list)
    output: dict | None = None
    tokens_used: int = 0
    warnings: list[str] = Field(default_factory=list)

    model_config = {"from_attributes": True}
