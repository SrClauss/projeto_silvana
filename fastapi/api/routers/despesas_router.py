"""
Router for Despesas (Expenses)
"""

from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
from datetime import datetime
from ..models.despesas import Despesa
from ..database.despesas_db import (
    create_despesa,
    get_despesas,
    get_despesa_by_id,
    update_despesa,
    delete_despesa,
    get_despesas_por_mes
)
from ..routers.auth import get_current_user

router = APIRouter()


@router.post("/", dependencies=[Depends(get_current_user)])
async def create_despesa_endpoint(despesa: Despesa):
    """
    Create a new expense record.
    
    Expenses track business costs and outflows.
    """
    despesa_id = await create_despesa(despesa)
    return {"id": str(despesa_id)}


@router.get("/", dependencies=[Depends(get_current_user)])
async def get_despesas_endpoint():
    """Get all expense records"""
    return await get_despesas()


@router.get("/mes/{ano}/{mes}", dependencies=[Depends(get_current_user)])
async def get_despesas_mes_endpoint(ano: int, mes: int):
    """
    Get expense records for a specific month.
    
    Path params:
        ano: Year (e.g., 2026)
        mes: Month (1-12)
    """
    if mes < 1 or mes > 12:
        raise HTTPException(status_code=400, detail="Month must be between 1 and 12")
    
    if ano < 1900 or ano > 2100:
        raise HTTPException(status_code=400, detail="Invalid year")
    
    return await get_despesas_por_mes(mes, ano)


@router.get("/{despesa_id}", dependencies=[Depends(get_current_user)])
async def get_despesa_endpoint(despesa_id: str):
    """Get a specific expense record by ID"""
    despesa = await get_despesa_by_id(despesa_id)
    if not despesa:
        raise HTTPException(status_code=404, detail="Expense record not found")
    return despesa


@router.put("/{despesa_id}", dependencies=[Depends(get_current_user)])
async def update_despesa_endpoint(despesa_id: str, update_data: dict):
    """Update an expense record"""
    update_data["updated_at"] = datetime.utcnow()
    despesa = await update_despesa(despesa_id, update_data)
    if not despesa:
        raise HTTPException(status_code=404, detail="Expense record not found")
    return despesa


@router.delete("/{despesa_id}", dependencies=[Depends(get_current_user)])
async def delete_despesa_endpoint(despesa_id: str):
    """Delete an expense record"""
    result = await delete_despesa(despesa_id)
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Expense record not found")
    return {"message": "Expense record deleted successfully"}
