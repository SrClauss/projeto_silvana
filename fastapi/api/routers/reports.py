from fastapi import APIRouter, Depends, HTTPException
from ..routers.auth import require_role
from ..models.users import Role
from ..database import condicional_fornecedor_db, condicional_cliente_db, desejo_cliente_db, tags_db, saidas_db, despesas_db, imposto_a_recolher_db
from datetime import datetime, timedelta

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
        podem_devolver = cond.get("quantidade_max_devolucao") or 0
        
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

@router.get("/dashboard")
async def get_dashboard():
    today = datetime.today()
    start_of_month = today.replace(day=1)
    start_of_last_month = (start_of_month - timedelta(days=1)).replace(day=1)
    end_of_last_month = start_of_month - timedelta(days=1)

    # Daily Sales: last 30 days, only vendas
    thirty_days_ago = today - timedelta(days=30)
    daily_sales_pipeline = [
        {"$match": {"data_saida": {"$gte": thirty_days_ago}, "tipo": "venda"}},
        {"$group": {"_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$data_saida"}}, "sales": {"$sum": "$valor_total"}}},
        {"$sort": {"_id": 1}}
    ]
    daily_sales_cursor = saidas_db.db.saidas.aggregate(daily_sales_pipeline)
    daily_sales = [{"date": doc["_id"], "sales": doc["sales"]} async for doc in daily_sales_cursor]

    # Weekly Sales: last 5 weeks with variation
    five_weeks_ago = today - timedelta(weeks=5)
    weekly_sales_pipeline = [
        {"$match": {"data_saida": {"$gte": five_weeks_ago}, "tipo": "venda"}},
        {"$group": {"_id": {"$isoWeek": "$data_saida"}, "sales": {"$sum": "$valor_total"}}},
        {"$sort": {"_id": 1}}
    ]
    weekly_sales_cursor = saidas_db.db.saidas.aggregate(weekly_sales_pipeline)
    weekly_sales_docs = [doc async for doc in weekly_sales_cursor]
    weekly_sales = []
    for i, doc in enumerate(weekly_sales_docs):
        variation = 0.0
        if i > 0:
            prev_sales = weekly_sales_docs[i-1]["sales"]
            if prev_sales > 0:
                variation = round(((doc["sales"] - prev_sales) / prev_sales) * 100, 1)
        # For simplicity, use week number, frontend can format
        weekly_sales.append({"week": f"Semana {i+1}", "total": doc["sales"], "variation": variation})

    # Monthly Comparison: last month vs current month
    current_month_pipeline = [
        {"$match": {"data_saida": {"$gte": start_of_month}, "tipo": "venda"}},
        {"$group": {"_id": None, "sales": {"$sum": "$valor_total"}}}
    ]
    last_month_pipeline = [
        {"$match": {"data_saida": {"$gte": start_of_last_month, "$lte": end_of_last_month}, "tipo": "venda"}},
        {"$group": {"_id": None, "sales": {"$sum": "$valor_total"}}}
    ]
    current_month_cursor = saidas_db.db.saidas.aggregate(current_month_pipeline)
    current_month_docs = [doc async for doc in current_month_cursor]
    current_sales = current_month_docs[0]["sales"] if current_month_docs else 0

    last_month_cursor = saidas_db.db.saidas.aggregate(last_month_pipeline)
    last_month_docs = [doc async for doc in last_month_cursor]
    last_sales = last_month_docs[0]["sales"] if last_month_docs else 0

    monthly_comparison = {"lastMonth": last_sales, "currentMonth": current_sales}

    # Weekly Comparison: current week vs last week, day by day
    start_of_week = today - timedelta(days=today.weekday())
    start_of_last_week = start_of_week - timedelta(weeks=1)
    end_of_last_week = start_of_week - timedelta(days=1)

    current_week_pipeline = [
        {"$match": {"data_saida": {"$gte": start_of_week}, "tipo": "venda"}},
        {"$group": {"_id": {"$dayOfWeek": "$data_saida"}, "sales": {"$sum": "$valor_total"}}},
        {"$sort": {"_id": 1}}
    ]
    last_week_pipeline = [
        {"$match": {"data_saida": {"$gte": start_of_last_week, "$lte": end_of_last_week}, "tipo": "venda"}},
        {"$group": {"_id": {"$dayOfWeek": "$data_saida"}, "sales": {"$sum": "$valor_total"}}},
        {"$sort": {"_id": 1}}
    ]
    current_week_cursor = saidas_db.db.saidas.aggregate(current_week_pipeline)
    current_week_docs = {doc["_id"]: doc["sales"] async for doc in current_week_cursor}

    last_week_cursor = saidas_db.db.saidas.aggregate(last_week_pipeline)
    last_week_docs = {doc["_id"]: doc["sales"] async for doc in last_week_cursor}

    day_names = {1: "Segunda", 2: "Terça", 3: "Quarta", 4: "Quinta", 5: "Sexta", 6: "Sábado", 7: "Domingo"}
    weekly_comparison = []
    for day in range(1, 8):  # 1=Monday, 7=Sunday
        current = current_week_docs.get(day, 0)
        last = last_week_docs.get(day, 0)
        weekly_comparison.append({"day": day_names[day], "currentWeek": current, "previousWeek": last})

    # Other metrics
    faturamento_mes_corrente = current_sales
    gasto_mes_corrente_pipeline = [
        {"$match": {"data_despesa": {"$gte": start_of_month}}},
        {"$group": {"_id": None, "total": {"$sum": "$valor"}}}
    ]
    gasto_cursor = despesas_db.db.despesas.aggregate(gasto_mes_corrente_pipeline)
    gasto_docs = [doc async for doc in gasto_cursor]
    gasto_mes_corrente = gasto_docs[0]["total"] if gasto_docs else 0

    # Pecas em condicionais: count from condicional_cliente
    pecas_em_condicionais = await condicional_cliente_db.db.condicional_clientes.count_documents({})

    # Percentual conversao condicionais: assume some logic, placeholder
    percentual_conversao_condicionais = 75.0  # Need to calculate based on converted vs total

    # Pecas devolvidas por condicional: placeholder
    pecas_devolvidas_por_condicional = 30

    # Ticket medio condicional: average valor_total from condicional_cliente
    ticket_pipeline = [
        {"$group": {"_id": None, "avg": {"$avg": "$valor_total"}}}
    ]
    ticket_cursor = condicional_cliente_db.db.condicional_clientes.aggregate(ticket_pipeline)
    ticket_docs = [doc async for doc in ticket_cursor]
    ticket_medio_condicional = ticket_docs[0]["avg"] if ticket_docs else 0

    # Impostos a recolher: sum from imposto_a_recolher
    imposto_pipeline = [
        {"$group": {"_id": None, "total": {"$sum": "$valor"}}}
    ]
    imposto_cursor = imposto_a_recolher_db.db.imposto_a_recolher.aggregate(imposto_pipeline)
    imposto_docs = [doc async for doc in imposto_cursor]
    impostos_a_recolher = imposto_docs[0]["total"] if imposto_docs else 0

    # Despesas meios pagamento: sum from modalidade_pagamento or something, placeholder
    despesas_meios_pagamento = 1500

    return {
        "faturamentoMesCorrente": faturamento_mes_corrente,
        "gastoMesCorrente": gasto_mes_corrente,
        "pecasEmCondicionais": pecas_em_condicionais,
        "percentualConversaoCondicionais": percentual_conversao_condicionais,
        "pecasDevolvidasPorCondicional": pecas_devolvidas_por_condicional,
        "ticketMedioCondicional": ticket_medio_condicional,
        "impostosARecolher": impostos_a_recolher,
        "despesasMeiosPagamento": despesas_meios_pagamento,
        "dailySales": daily_sales,
        "weeklySales": weekly_sales,
        "monthlyComparison": monthly_comparison,
        "weeklyComparison": weekly_comparison,
    }