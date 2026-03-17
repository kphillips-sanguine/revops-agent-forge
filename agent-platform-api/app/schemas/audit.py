from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class AuditEntryResponse(BaseModel):
    id: UUID
    entity_type: str
    entity_id: UUID
    action: str
    actor: UUID
    details: dict | None = None
    created_at: datetime

    model_config = {"from_attributes": True}
