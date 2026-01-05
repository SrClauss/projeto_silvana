#entradas

from pydantic import BaseModel, Field
from typing import List, Literal, Optional
from datetime import datetime
from bson import ObjectId


TypoEntrada = Literal["compra", "devolucao", "condicional_fornecedor"]


class Entrada(BaseModel):

    id: str = Field(default_factory=lambda: str(ObjectId()), alias="_id")
    produtos_id: str
    quantidade: int
    cliente_id: Optional[str] = None
    fornecedor_id: Optional[str] = None
    tipo: TypoEntrada
    data_entrada: datetime = Field(default_factory=datetime.utcnow)
    observacoes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None
    

    class Config:
        populate_by_name = True

