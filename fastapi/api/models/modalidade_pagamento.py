from pydantic import BaseModel, Field
from typing import Optional, Literal, List
from datetime import datetime
from bson import ObjectId

class ImpostoConfig(BaseModel):
    tipo: Literal["ICMS", "PIS", "COFINS", "outros"]
    percentual: float

class ModalidadePagamento(BaseModel):
    id: str = Field(default_factory=lambda: str(ObjectId()), alias="_id")
    nome: str
    tipo_taxa: Literal["percentual", "fixa"]
    valor_taxa: float
    impostos: List[ImpostoConfig] = []  # Impostos associados
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None

    class Config:
        populate_by_name = True