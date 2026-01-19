from pydantic import BaseModel, Field
from datetime import datetime
from bson import ObjectId
from typing import Optional
from .condicional_cliente import CondicionalCliente
from .condicional_fornecedor import CondicionalFornecedor


class Item(BaseModel):
    quantity: int
    acquisition_date: datetime = Field(default_factory=datetime.utcnow)
    # lista de ids de condicionais fornecedor associados a ESTA unidade
    condicionais_fornecedor: list[str] = Field(default_factory=list)
    # lista de ids de condicionais cliente associados a ESTA unidade (reservas)
    condicionais_cliente: list[str] = Field(default_factory=list)

    # campos opcionais para incluir objetos embutidos (não usados para persistência obrigatória)
    conditional_cliente: Optional[CondicionalCliente] = None
    conditional_fornecedor: Optional[CondicionalFornecedor] = None

    class Config:
        populate_by_name = True