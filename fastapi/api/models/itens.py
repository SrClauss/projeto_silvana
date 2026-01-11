from pydantic import BaseModel, Field
from datetime import datetime
from bson import ObjectId
from typing import Optional


class Item(BaseModel):
    quantity: int
    acquisition_date: datetime = Field(default_factory=datetime.utcnow)
    condicional_fornecedor_id: Optional[str] = None
    condicional_cliente_id: Optional[str] = None
    
    class Config:
        populate_by_name = True