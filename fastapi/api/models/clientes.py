from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from bson import ObjectId

class Endereco(BaseModel):
    cep: str
    logradouro: str
    bairro: str
    cidade: str
    estado: str
    numero: str
    complemento: Optional[str] = None

class Cliente(BaseModel):
    id: str = Field(default_factory=lambda: str(ObjectId()), alias="_id")
    nome: str
    telefone: str
    endereco: Endereco
    cpf: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None

    class Config:
        populate_by_name = True

