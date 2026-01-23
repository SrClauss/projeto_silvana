"""
Configuração de Impostos - Define alíquotas e regras para cálculo automático
"""

from pydantic import BaseModel, Field
from typing import Optional, Literal, List
from datetime import datetime
from bson import ObjectId


class ImpostoConfig(BaseModel):
    """
    Configuração de imposto que será aplicado às vendas.
    Múltiplas configurações podem existir, sendo aplicáveis baseadas em datas.
    """
    id: str = Field(default_factory=lambda: str(ObjectId()), alias="_id")
    nome: str  # Ex: "ICMS Padrão", "PIS/COFINS Simples Nacional"
    tipo_imposto: Literal["ICMS", "PIS", "COFINS", "ISS", "outros"]
    aliquota_percentual: float  # Ex: 18.0 para 18%
    ativa: bool = True
    
    # Vencimento do imposto (dias após a venda)
    dias_vencimento: int = 30  # Ex: 30 dias após a venda
    
    # Aplicável a partir de uma data específica
    data_inicio: datetime = Field(default_factory=datetime.utcnow)
    data_fim: Optional[datetime] = None  # None = sem fim
    
    # Filtros de aplicabilidade (opcional)
    aplicar_produtos_categoria: Optional[List[str]] = None  # Categorias específicas
    aplicar_produtos_tag: Optional[List[str]] = None  # Tags específicas
    valor_minimo_venda: Optional[float] = None  # Aplica só se venda >= valor
    
    observacoes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None
    
    class Config:
        populate_by_name = True
