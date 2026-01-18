from fastapi import APIRouter, Depends, HTTPException
from ..models.produtos import Produto
from ..database.produtos_db import (
    create_produto, get_produtos, get_produto_by_id,
    update_produto, delete_produto, can_delete_produto, get_produtos_by_tags, search_produtos,
    exists_codigo_interno, get_last_codigo_interno
)
from ..database.tags_db import get_tags, find_tags_by_query, get_or_create_tag_by_descricao, delete_tag
from ..routers.auth import get_current_user

router = APIRouter()

@router.post("/", dependencies=[Depends(get_current_user)])
async def create_produto_endpoint(produto: Produto):
    # garantir unicidade do codigo_interno
    if await exists_codigo_interno(produto.codigo_interno):
        raise HTTPException(status_code=400, detail="codigo_interno already exists")
    produto_id = await create_produto(produto)
    return {"id": produto_id}

@router.get("/", dependencies=[Depends(get_current_user)])
async def get_produtos_endpoint():
    return await get_produtos()

@router.get("/{produto_id}", dependencies=[Depends(get_current_user)])
async def get_produto(produto_id: str):
    produto = await get_produto_by_id(produto_id)
    if not produto:
        raise HTTPException(status_code=404, detail="Produto not found")
    return produto

@router.put("/{produto_id}", dependencies=[Depends(get_current_user)])
async def update_produto_endpoint(produto_id: str, update_data: dict):
    # If codigo_interno is being changed, ensure uniqueness excluding this document
    if update_data.get('codigo_interno'):
        if await exists_codigo_interno(update_data['codigo_interno'], exclude_id=produto_id):
            raise HTTPException(status_code=400, detail="codigo_interno already exists")
    produto = await update_produto(produto_id, update_data)
    if not produto:
        raise HTTPException(status_code=404, detail="Produto not found")
    return produto

@router.delete("/{produto_id}", dependencies=[Depends(get_current_user)])
async def delete_produto_endpoint(produto_id: str):
    can_delete = await can_delete_produto(produto_id)
    if can_delete is None:
        raise HTTPException(status_code=404, detail="Produto not found")
    if not can_delete:
        raise HTTPException(status_code=409, detail="Produto está em condicional e não pode ser removido")

    result = await delete_produto(produto_id)
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Produto not found")
    return {"message": "Produto deleted"}

@router.get("/search/", dependencies=[Depends(get_current_user)])
async def search_produtos_endpoint(query: str):
    return await search_produtos(query)

@router.get("/by-tags/", dependencies=[Depends(get_current_user)])
async def get_produtos_by_tags_endpoint(tag_ids: str, mode: str = 'OR'):
    tag_list = [t for t in tag_ids.split(",") if t]
    mode = (mode or 'OR').upper()
    if mode not in ('AND', 'OR'):
        mode = 'OR'
    return await get_produtos_by_tags(tag_list, mode=mode)

@router.get("/tags/", dependencies=[Depends(get_current_user)])
async def get_tags_endpoint():
    return await get_tags()

@router.get("/tags/search/", dependencies=[Depends(get_current_user)])
async def search_tags_endpoint(q: str):
    return await find_tags_by_query(q)

@router.post("/tags/", dependencies=[Depends(get_current_user)])
async def create_tag_endpoint(tag: dict):
    descricao = tag.get('descricao')
    if not descricao or not str(descricao).strip():
        raise HTTPException(status_code=400, detail="descricao is required")
    import re
    if re.search(r"\s", descricao):
        raise HTTPException(status_code=400, detail="descricao cannot contain spaces")
    created = await get_or_create_tag_by_descricao(descricao)
    return created

@router.delete('/tags/{tag_id}', dependencies=[Depends(get_current_user)])
async def delete_tag_endpoint(tag_id: str):
    result = await delete_tag(tag_id)
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail='Tag not found')
    return {'message': 'Tag deleted'}

@router.get('/codigo-interno/last', dependencies=[Depends(get_current_user)])
async def get_last_codigo_interno_endpoint():
    last = await get_last_codigo_interno()
    # sugere próximo: incrementa sufixo numérico se possível
    suggested = None
    if last:
        import re
        m = re.match(r"^(.*?)(\d+)$", last)
        if m:
            prefix, digits = m.groups()
            next_num = str(int(digits) + 1).zfill(len(digits))
            suggested = f"{prefix}{next_num}"
        else:
            suggested = f"{last}1"
    else:
        suggested = "1"
    return {"last": last, "suggested": suggested}


@router.get('/codigo-interno/exists', dependencies=[Depends(get_current_user)])
async def exists_codigo_interno_endpoint(codigo: str):
    """Retorna se um codigo_interno já existe (true/false)."""
    exists = await exists_codigo_interno(codigo)
    return {"exists": exists}