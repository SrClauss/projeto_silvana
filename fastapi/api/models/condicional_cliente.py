#Envio de peças condicional para clientes

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from bson import ObjectId


class ProdutoQuantity(BaseModel):
    produto_id: str
    quantidade: int

class CondicionalCliente(BaseModel):
    id: str = Field(default_factory=lambda: str(ObjectId()), alias="_id")
    cliente_id: str
    produtos: List[ProdutoQuantity]
    data_condicional: datetime = Field(default_factory=datetime.utcnow)
    data_devolucao: Optional[datetime] = None
    ativa: bool = True
    observacoes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None


    class Config:
        populate_by_name = True