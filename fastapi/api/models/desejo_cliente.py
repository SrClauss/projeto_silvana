from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from bson import ObjectId
from .tags import Tag

class DesejoCliente(BaseModel):
    id: str = Field(default_factory=lambda: str(ObjectId()), alias="_id")
    cliente_id: str
    descricao: str
    tags: List[Tag]
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None

    class Config:
        populate_by_name = True