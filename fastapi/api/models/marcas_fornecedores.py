from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from bson import ObjectId



class MarcaFornecedor(BaseModel):
    id: str = Field(default_factory=lambda: str(ObjectId()), alias="_id")
    nome: str
    fornecedor: str
    cnpj: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None


    class Config:
        populate_by_name = True