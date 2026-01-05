from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime
from bson import ObjectId

class ImpostoARecolher(BaseModel):
    id: str = Field(default_factory=lambda: str(ObjectId()), alias="_id")
    saida_id: str
    valor_imposto: float
    tipo_imposto: Literal["ICMS", "PIS", "COFINS", "outros"] = "outros"
    data_vencimento: datetime
    status: Literal["pendente", "pago"] = "pendente"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None

    class Config:
        populate_by_name = True