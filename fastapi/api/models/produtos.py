from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from bson import ObjectId
from .itens import Item
from .tags import Tag
from .entradas import Entrada
from .saidas import Saida

from .marcas_fornecedores import MarcaFornecedor
class Produto(BaseModel):
    id: str = Field(default_factory=lambda: str(ObjectId()), alias="_id")
    codigo_interno: str
    codigo_externo: str
    descricao: str
    marca_fornecedor: str
    sessao: str
    em_condicional_fornecedor: bool = False
    em_condicional_cliente: bool = False
    itens: List[Item]
    preco_custo: int
    preco_venda: int
    saidas: List[Saida]
    entradas: List[Entrada]
    tags: List[Tag]
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None

    class Config:
        populate_by_name = True