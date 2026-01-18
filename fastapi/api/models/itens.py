from pydantic import BaseModel, Field
from datetime import datetime
from bson import ObjectId
from typing import Optional
from .condicional_cliente import CondicionalCliente
from .condicional_fornecedor import CondicionalFornecedor


class Item(BaseModel):
    quantity: int
    acquisition_date: datetime = Field(default_factory=datetime.utcnow)
    conditional_cliente: Optional[CondicionalCliente] = None
    conditional_fornecedor: Optional[CondicionalFornecedor] = None
    
    class Config:
        populate_by_name = True