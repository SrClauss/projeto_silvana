from fastapi import APIRouter, Depends, HTTPException
from ..routers.auth import require_role
from ..models.users import Role
from ..database import condicional_fornecedor_db, condicional_cliente_db, desejo_cliente_db, tags_db

router = APIRouter(dependencies=[Depends(require_role(Role.ADMIN))])
async def desempenho_condicionais_fornecedor():
    # Para cada condicional fornecedor, calcular vendas, stock, devoluções possíveis
    condicionais = await condicional_fornecedor_db.get_condicional_fornecedores()
    result = []
    for cond in condicionais:
        # Peças vendidas: saídas relacionadas aos produtos
        produtos_ids = cond["produtos_id"]
        vendas = await saidas_db.db.saidas.count_documents({"produtos_id": {"$in": produtos_ids}, "tipo": "venda"})
        
        # Em stock: quantidade atual dos produtos
        stock = 0
        for pid in produtos_ids:
            prod = await produtos_db.get_produto_by_id(pid)
            if prod:
                # Calcular quantidade: entradas - saídas
                entradas = await saidas_db.db.entradas.find({"produtos_id": pid}).to_list(None)
                saidas = await saidas_db.db.saidas.find({"produtos_id": pid}).to_list(None)
                total_entradas = sum(e["quantidade"] for e in entradas)
                total_saidas = sum(s["quantidade"] for s in saidas)
                stock += total_entradas - total_saidas
        
        # Podem ser devolvidas: quantidade_max_devolucao
        podem_devolver = cond.get("quantidade_max_devolucao", 0)
        
        result.append({
            "condicional_id": cond["_id"],
            "pecas_vendidas": vendas,
            "em_stock": stock,
            "podem_ser_devolvidas": podem_devolver
        })
    return result

@router.get("/estatisticas_condicionais_cliente")
async def estatisticas_condicionais_cliente():
    condicionais = await condicional_cliente_db.get_condicionais_ativas()
    total_pecas = 0
    pecas_vendidas = 0
    pecas_devolvidas = 0
    
    for cond in condicionais:
        for prod in cond["produtos"]:
            quantidade = prod["quantidade"]
            total_pecas += quantidade
            
            # Verificar se foi vendido ou devolvido (assumindo que se não está mais em condicional, foi vendido)
            # Para simplificar, contar saídas relacionadas
            saidas = await saidas_db.db.saidas.find({"produtos_id": prod["produto_id"]}).to_list(None)
            quantidade_saida = sum(s["quantidade"] for s in saidas)
            pecas_vendidas += quantidade_saida
            pecas_devolvidas += quantidade - quantidade_saida  # Assumindo que o resto foi devolvido
    
    porcentagem_vendidas = (pecas_vendidas / total_pecas * 100) if total_pecas > 0 else 0
    porcentagem_devolvidas = (pecas_devolvidas / total_pecas * 100) if total_pecas > 0 else 0
    
    return {
        "total_pecas": total_pecas,
        "pecas_vendidas": pecas_vendidas,
        "pecas_devolvidas": pecas_devolvidas,
        "porcentagem_vendidas": porcentagem_vendidas,
        "porcentagem_devolvidas": porcentagem_devolvidas
    }

@router.get("/foco_compras")
async def foco_compras():
    desejos = await desejo_cliente_db.get_desejos_clientes()
    tag_counts = {}
    
    for desejo in desejos:
        for tag in desejo["tags"]:
            tag_id = tag["_id"]
            tag_counts[tag_id] = tag_counts.get(tag_id, 0) + 1
    
    # Ordenar por frequência
    sorted_tags = sorted(tag_counts.items(), key=lambda x: x[1], reverse=True)
    
    # Retornar tags com nomes
    result = []
    for tag_id, count in sorted_tags:
        tag = await tags_db.get_tag_by_id(tag_id)
        if tag:
            result.append({"tag": tag["descricao"], "frequencia": count})
    
    return result

router = APIRouter(dependencies=[Depends(require_role(Role.ADMIN))])

@router.get("/vendas_por_mes")
async def vendas_por_mes(ano: int):
    pipeline = [
        {"$match": {
            "tipo": "venda",
            "data_saida": {"$gte": datetime(ano, 1, 1), "$lt": datetime(ano+1, 1, 1)}
        }},
        {"$group": {"_id": {"$month": "$data_saida"}, "total": {"$sum": "$valor_total"}}},
        {"$sort": {"_id": 1}}
    ]
    result = await saidas_db.db.saidas.aggregate(pipeline).to_list(None)
    return result

@router.get("/estoque_baixo")
async def estoque_baixo(limite: int = 5):
    # Assumindo que produtos têm campo 'quantidade' calculada
    # Para simplificar, vamos usar entradas - saidas
    pipeline = [
        {"$lookup": {"from": "entradas", "localField": "_id", "foreignField": "produtos_id", "as": "entradas"}},
        {"$lookup": {"from": "saidas", "localField": "_id", "foreignField": "produtos_id", "as": "saidas"}},
        {"$addFields": {
            "total_entradas": {"$sum": "$entradas.quantidade"},
            "total_saidas": {"$sum": "$saidas.quantidade"},
            "quantidade": {"$subtract": ["$total_entradas", "$total_saidas"]}
        }},
        {"$match": {"quantidade": {"$lt": limite}}},
        {"$project": {"entradas": 0, "saidas": 0}}
    ]
    return await produtos_db.db.produtos.aggregate(pipeline).to_list(None)

@router.get("/lucro")
async def lucro(mes: int, ano: int):
    # Faturamento do mês
    vendas = await faturamento_item_db.get_faturamento_itens_por_mes(mes, ano)
    total_vendas = sum(v["valor"] for v in vendas) if vendas else 0
    
    # Despesas do mês
    despesas = await despesas_db.get_despesas_por_mes(mes, ano)
    total_despesas = sum(d["valor"] for d in despesas) if despesas else 0
    
    return {"lucro": total_vendas - total_despesas, "vendas": total_vendas, "despesas": total_despesas}