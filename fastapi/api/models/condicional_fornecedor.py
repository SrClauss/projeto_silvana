from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from bson import ObjectId





class CondicionalFornecedor(BaseModel):
    id: str = Field(default_factory=lambda: str(ObjectId()), alias="_id")
    fornecedor_id: str
    produtos_id: List[str]
    quantidade_max_devolucao: int = 0
    data_condicional: datetime = Field(default_factory=datetime.utcnow)
    observacoes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None


    class Config:
        populate_by_name = True