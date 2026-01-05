from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from bson import ObjectId

class FaturamentoItem(BaseModel):
    id: str = Field(default_factory=lambda: str(ObjectId()), alias="_id")
    saida_id: Optional[str] = None  # Fonte opcional
    valor: int
    justificativa: str
    data_faturamento: datetime = Field(default_factory=datetime.utcnow)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None

    class Config:
        populate_by_name = True