"""
Router for tax configuration (ImpostoConfig)
"""

from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from datetime import datetime
from ..models.imposto_config import ImpostoConfig
from ..database.imposto_config_db import (
    create_imposto_config,
    get_impostos_config,
    get_imposto_config_by_id,
    update_imposto_config,
    delete_imposto_config,
    get_impostos_config_ativas
)
from ..routers.auth import get_current_user

router = APIRouter()


@router.post("/", dependencies=[Depends(get_current_user)])
async def create_imposto_config_endpoint(config: ImpostoConfig):
    """
    Create a new tax configuration.
    
    Tax configurations define automatic tax calculations for sales.
    Multiple configurations can be active simultaneously.
    """
    config_id = await create_imposto_config(config)
    return {"id": str(config_id)}


@router.get("/", dependencies=[Depends(get_current_user)])
async def get_impostos_config_endpoint():
    """Get all tax configurations"""
    return await get_impostos_config()


@router.get("/ativas", dependencies=[Depends(get_current_user)])
async def get_impostos_config_ativas_endpoint(data_referencia: Optional[str] = None):
    """
    Get all active tax configurations for a specific date.
    If no date provided, uses current date.
    
    Query params:
        data_referencia: ISO date string (e.g., "2026-01-15T10:00:00")
    """
    data_ref = None
    if data_referencia:
        try:
            data_ref = datetime.fromisoformat(data_referencia)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use ISO format (YYYY-MM-DDTHH:MM:SS)")
    
    configs = await get_impostos_config_ativas(data_ref)
    return configs


@router.get("/{config_id}", dependencies=[Depends(get_current_user)])
async def get_imposto_config_endpoint(config_id: str):
    """Get a specific tax configuration by ID"""
    config = await get_imposto_config_by_id(config_id)
    if not config:
        raise HTTPException(status_code=404, detail="Tax configuration not found")
    return config


@router.put("/{config_id}", dependencies=[Depends(get_current_user)])
async def update_imposto_config_endpoint(config_id: str, update_data: dict):
    """Update a tax configuration"""
    config = await update_imposto_config(config_id, update_data)
    if not config:
        raise HTTPException(status_code=404, detail="Tax configuration not found")
    return config


@router.delete("/{config_id}", dependencies=[Depends(get_current_user)])
async def delete_imposto_config_endpoint(config_id: str):
    """Delete a tax configuration"""
    result = await delete_imposto_config(config_id)
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Tax configuration not found")
    return {"message": "Tax configuration deleted successfully"}
