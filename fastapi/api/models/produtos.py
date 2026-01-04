from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from pymongo import ObjectId
from .itens import Item
from .tags import Tag

class Produto(BaseModel):
    id = Field(default_factory=lambda: str(ObjectId()), alias="_id")
    codigo_interno: str
    codigo_externo: str
    marca: str
    sessao: str
    itens: List[Item]
    preco_custo: float
    preco_venda: float
    tags: List[Tag]
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None

    class Config:
        allow_population_by_field_name = True