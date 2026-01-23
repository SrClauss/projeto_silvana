"""
Router for Impostos A Recolher (Taxes to Collect)
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from ..models.imposto_a_recolher import ImpostoARecolher
from ..database.imposto_a_recolher_db import (
    create_imposto_a_recolher,
    get_impostos_a_recolher,
    get_imposto_a_recolher_by_id,
    update_imposto_a_recolher,
    delete_imposto_a_recolher,
    get_impostos_pendentes,
    get_impostos_agregados_por_periodo,
    get_impostos_pendentes_por_periodo
)
from ..routers.auth import get_current_user

router = APIRouter()


class MarcarPagoRequest(BaseModel):
    """Request body para marcar imposto como pago"""
    data_pagamento: Optional[datetime] = None


@router.post("/", dependencies=[Depends(get_current_user)])
async def create_imposto_endpoint(imposto: ImpostoARecolher):
    """Create a new tax record"""
    imposto_id = await create_imposto_a_recolher(imposto)
    return {"id": str(imposto_id)}


@router.get("/", dependencies=[Depends(get_current_user)])
async def get_impostos_endpoint():
    """Get all tax records"""
    return await get_impostos_a_recolher()


@router.get("/pendentes", dependencies=[Depends(get_current_user)])
async def get_impostos_pendentes_endpoint():
    """Get all pending (unpaid) tax records"""
    return await get_impostos_pendentes()


@router.get("/pendentes/periodo", dependencies=[Depends(get_current_user)])
async def get_impostos_pendentes_periodo_endpoint(
    data_inicio: str,
    data_fim: str
):
    """
    Get pending tax records within a date range.
    
    Query params:
        data_inicio: ISO date string (e.g., "2026-01-01")
        data_fim: ISO date string (e.g., "2026-01-31")
    """
    try:
        inicio = datetime.fromisoformat(data_inicio)
        fim = datetime.fromisoformat(data_fim)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use ISO format (YYYY-MM-DD)")
    
    return await get_impostos_pendentes_por_periodo(inicio, fim)


@router.get("/agregados/periodo", dependencies=[Depends(get_current_user)])
async def get_impostos_agregados_endpoint(
    data_inicio: str,
    data_fim: str
):
    """
    Get aggregated tax data by type within a date range.
    Returns total and count grouped by tax type.
    
    Query params:
        data_inicio: ISO date string
        data_fim: ISO date string
    """
    try:
        inicio = datetime.fromisoformat(data_inicio)
        fim = datetime.fromisoformat(data_fim)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use ISO format (YYYY-MM-DD)")
    
    return await get_impostos_agregados_por_periodo(inicio, fim)


@router.get("/{imposto_id}", dependencies=[Depends(get_current_user)])
async def get_imposto_endpoint(imposto_id: str):
    """Get a specific tax record by ID"""
    imposto = await get_imposto_a_recolher_by_id(imposto_id)
    if not imposto:
        raise HTTPException(status_code=404, detail="Tax record not found")
    return imposto


@router.put("/{imposto_id}", dependencies=[Depends(get_current_user)])
async def update_imposto_endpoint(imposto_id: str, update_data: dict):
    """Update a tax record"""
    imposto = await update_imposto_a_recolher(imposto_id, update_data)
    if not imposto:
        raise HTTPException(status_code=404, detail="Tax record not found")
    return imposto


@router.post("/{imposto_id}/marcar-pago", dependencies=[Depends(get_current_user)])
async def marcar_pago_endpoint(imposto_id: str, request: MarcarPagoRequest):
    """Mark a tax record as paid"""
    update_data = {
        "status": "pago",
        "updated_at": datetime.utcnow()
    }
    
    imposto = await update_imposto_a_recolher(imposto_id, update_data)
    if not imposto:
        raise HTTPException(status_code=404, detail="Tax record not found")
    return imposto


@router.delete("/{imposto_id}", dependencies=[Depends(get_current_user)])
async def delete_imposto_endpoint(imposto_id: str):
    """Delete a tax record"""
    result = await delete_imposto_a_recolher(imposto_id)
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Tax record not found")
    return {"message": "Tax record deleted successfully"}
