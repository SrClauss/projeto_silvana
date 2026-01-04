from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from pymongo import ObjectId

class Cliente(BaseModel):
    id = Field(default_factory=lambda: str(ObjectId()), alias="_id")
    nome: str
    telefone: str
    endereco: str
    cpf: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None

    class Config:
        allow_population_by_field_name = 