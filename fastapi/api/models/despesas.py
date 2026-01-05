#despesas

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from bson import ObjectId

class Despesa(BaseModel):
    id: str = Field(default_factory=lambda: str(ObjectId()), alias="_id")
    descricao: str
    valor: int
    data_despesa: datetime = Field(default_factory=datetime.utcnow)
    categoria: Optional[str] = None
    observacoes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None

    class Config:
        populate_by_name = True