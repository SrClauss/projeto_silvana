"""
Database functions for tax configuration (ImpostoConfig)
"""

from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ReturnDocument
from ..models.imposto_config import ImpostoConfig
from ..models.imposto_a_recolher import ImpostoARecolher
from datetime import datetime, timedelta
from typing import List, Optional
import os
import logging

logger = logging.getLogger(__name__)

client = AsyncIOMotorClient(os.getenv("MONGODB_URL", "mongodb://localhost:27017"))
db = client["projeto_silvana"]


# CRUD for ImpostoConfig
async def create_imposto_config(config: ImpostoConfig):
    """Create a new tax configuration"""
    result = await db.imposto_config.insert_one(config.dict(by_alias=True))
    logger.info(f"Created tax config: {result.inserted_id}")
    return result.inserted_id


async def get_impostos_config():
    """Get all tax configurations"""
    return await db.imposto_config.find().to_list(None)


async def get_imposto_config_by_id(config_id: str):
    """Get a specific tax configuration by ID"""
    return await db.imposto_config.find_one({"_id": config_id})


async def update_imposto_config(config_id: str, update_data: dict):
    """Update a tax configuration"""
    update_data["updated_at"] = datetime.utcnow()
    return await db.imposto_config.find_one_and_update(
        {"_id": config_id}, 
        {"$set": update_data}, 
        return_document=ReturnDocument.AFTER
    )


async def delete_imposto_config(config_id: str):
    """Delete a tax configuration"""
    return await db.imposto_config.delete_one({"_id": config_id})


async def get_impostos_config_ativas(data_referencia: Optional[datetime] = None):
    """
    Get all active tax configurations applicable at a given date.
    If no date provided, uses current date.
    """
    if data_referencia is None:
        data_referencia = datetime.utcnow()
    
    query = {
        "ativa": True,
        "data_inicio": {"$lte": data_referencia}
    }
    
    # Add filter for end date (either None or after reference date)
    configs = await db.imposto_config.find(query).to_list(None)
    
    # Filter by end date in Python (easier than complex MongoDB query)
    filtered = [
        c for c in configs 
        if c.get("data_fim") is None or c.get("data_fim") >= data_referencia
    ]
    
    return filtered


async def calcular_e_criar_impostos_para_venda(
    saida_id: str,
    valor_venda: float,
    produto: Optional[dict] = None,
    data_venda: Optional[datetime] = None
) -> List[str]:
    """
    Calculate and create tax records for a sale based on active tax configurations.
    
    Args:
        saida_id: ID of the sale (saida)
        valor_venda: Total sale value in cents (will convert to reais for calculation)
        produto: Product dict (for filtering by category/tags)
        data_venda: Sale date (defaults to now)
    
    Returns:
        List of created imposto IDs
    """
    if data_venda is None:
        data_venda = datetime.utcnow()
    
    if valor_venda <= 0:
        logger.warning(f"Sale {saida_id} has zero or negative value, skipping tax calculation")
        return []
    
    # Get active tax configurations
    configs_ativas = await get_impostos_config_ativas(data_venda)
    
    impostos_criados = []
    valor_venda_reais = valor_venda / 100.0  # Convert cents to reais
    
    for config in configs_ativas:
        # Check if config applies to this sale
        if not _config_aplica_a_venda(config, valor_venda_reais, produto):
            continue
        
        # Calculate tax amount
        aliquota = config.get("aliquota_percentual", 0.0)
        valor_imposto = valor_venda_reais * (aliquota / 100.0)
        
        if valor_imposto <= 0:
            continue
        
        # Calculate due date
        dias_vencimento = config.get("dias_vencimento", 30)
        data_vencimento = data_venda + timedelta(days=dias_vencimento)
        
        # Create tax record
        imposto = ImpostoARecolher(
            saida_id=saida_id,
            valor_imposto=valor_imposto,
            tipo_imposto=config.get("tipo_imposto", "outros"),
            data_vencimento=data_vencimento,
            status="pendente"
        )
        
        from .imposto_a_recolher_db import create_imposto_a_recolher
        imposto_id = await create_imposto_a_recolher(imposto)
        impostos_criados.append(str(imposto_id))
        
        logger.info(
            f"Created tax {imposto_id} for sale {saida_id}: "
            f"{config.get('nome')} {aliquota}% = R$ {valor_imposto:.2f}"
        )
    
    return impostos_criados


def _config_aplica_a_venda(config: dict, valor_venda_reais: float, produto: Optional[dict]) -> bool:
    """
    Check if a tax configuration applies to a given sale.
    
    Args:
        config: Tax configuration dict
        valor_venda_reais: Sale value in reais (not cents)
        produto: Product dict (optional)
    
    Returns:
        True if config applies, False otherwise
    """
    # Check minimum sale value
    valor_minimo = config.get("valor_minimo_venda")
    if valor_minimo is not None and valor_venda_reais < valor_minimo:
        return False
    
    # If no product, can't filter by category/tags - apply by default
    if produto is None:
        return True
    
    # Check product category filter
    categorias_config = config.get("aplicar_produtos_categoria")
    if categorias_config is not None:
        produto_categoria = produto.get("categoria")
        if produto_categoria not in categorias_config:
            return False
    
    # Check product tags filter
    tags_config = config.get("aplicar_produtos_tag")
    if tags_config is not None:
        produto_tags = produto.get("tags", [])
        # At least one tag must match
        if not any(tag in tags_config for tag in produto_tags):
            return False
    
    return True
