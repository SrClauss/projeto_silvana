from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, date
from bson import ObjectId





class CondicionalFornecedor(BaseModel):
    id: str = Field(default_factory=lambda: str(ObjectId()), alias="_id")
    fornecedor_id: str
    produtos_id: List[str] = Field(default_factory=list)
    quantidade_max_devolucao: Optional[int] = None
    data_condicional: date = Field(default_factory=lambda: datetime.utcnow().date())
    observacoes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None


    class Config:
        populate_by_name = True