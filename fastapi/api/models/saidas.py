from bson import ObjectId
from pydantic import BaseModel, Field
from typing import List, Literal, Optional
from datetime import datetime

TypoSaida = Literal["venda", "perca", "doacao", "devolucao", "condicional_fornecedor"]
class Saida(BaseModel):
    
    id: str = Field(default_factory=lambda: str(ObjectId()), alias="_id")
    produtos_id: str
    cliente_id: Optional[str] = None
    fornecedor_id: Optional[str] = None
    condicional_fornecedor_id: Optional[str] = None
    condicional_cliente_id: Optional[str] = None
    quantidade: int
    tipo: TypoSaida
    data_saida: datetime = Field(default_factory=datetime.utcnow)
    valor_total: Optional[int] = None
    observacoes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None
    

    class Config:
        populate_by_name = True




