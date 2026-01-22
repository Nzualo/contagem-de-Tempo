from __future__ import annotations
from io import BytesIO
from datetime import date
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors

PAGE_W, PAGE_H = A4  # 595 x 842 pt

def _fmt_date(d: date) -> str:
    return d.strftime("%d/%m/%Y")

def _money_pt(x: float) -> str:
    s = f"{x:,.2f}"
    return s.replace(",", "X").replace(".", ",").replace("X", ".")

def _txt(c: canvas.Canvas, x: float, y: float, t: str, size: int = 10, bold: bool = False):
    c.setFont("Helvetica-Bold" if bold else "Helvetica", size)
    c.drawString(x, y, t)

def _center(c: canvas.Canvas, y: float, t: str, size: int = 11, bold: bool = True):
    c.setFont("Helvetica-Bold" if bold else "Helvetica", size)
    c.drawCentredString(PAGE_W / 2, y, t)

def _line(c: canvas.Canvas, x1: float, y1: float, x2: float, y2: float, w: float = 1):
    c.setLineWidth(w)
    c.line(x1, y1, x2, y2)

def _rect(c: canvas.Canvas, x: float, y: float, w: float, h: float, lw: float = 1):
    c.setLineWidth(lw)
    c.rect(x, y, w, h)

def _dotted_line(c: canvas.Canvas, x1: float, y: float, x2: float):
    c.setDash(1, 2)
    c.line(x1, y, x2, y)
    c.setDash()

def _draw_header(c: canvas.Canvas):
    # Brasão simplificado (círculo) – opcional, pode remover
    c.setStrokeColor(colors.black)
    c.setLineWidth(1)
    c.circle(PAGE_W/2, PAGE_H-55, 16)

    _center(c, PAGE_H - 80, "REPÚBLICA DE MOÇAMBIQUE", 12, True)
    _center(c, PAGE_H - 95, "GOVERNO DO DISTRITO DE INHASSORO", 10, True)
    _center(c, PAGE_H - 110, "SERVIÇO DISTRITAL DE EDUCAÇÃO JUVENTUDE E TECNOLOGIA", 10, True)

def _draw_identity_line(c: canvas.Canvas, y: float):
    _txt(c, 40, y, "Nome:", 10, False)
    _dotted_line(c, 75, y-2, 300)

    _txt(c, 320, y, "Categoria:", 10, False)
    _dotted_line(c, 380, y-2, 455)

    _txt(c, 465, y, "Classe:", 10, False)
    _dotted_line(c, 510, y-2, 555)

    _txt(c, 560, y, "Escalão:", 10, False)
    # último campo sem linha longa (fica apertado); deixa curto
    _dotted_line(c, 610, y-2, 585)  # inofensivo (não desenha se invertido)

def _draw_time_table(c: canvas.Canvas, title: str, x: float, y: float, w: float, h: float, rows: int = 6):
    """
    Tabela com colunas: OBSERVAÇÃO | DATA | A | M | D | (repetição A M D x N)
    Para ficar parecido com o impresso: vamos fazer 1 bloco AMD “principal” e 4 blocos AMD vazios.
    """
    _center(c, y + h + 10, title, 11, True)

    _rect(c, x, y, w, h, 1)

    # Proporções
    col_obs = 110
    col_data = 70
    col_amd = 30   # cada A/M/D
    blocks = 5     # 1 preenchido + 4 vazios
    total_amd_cols = blocks * 3

    # Calcula largura restante e ajusta col_amd se necessário
    used = col_obs + col_data + total_amd_cols * col_amd
    if used > w:
        col_amd = (w - col_obs - col_data) / (total_amd_cols)
    # Linhas horizontais
    row_h = h / (rows + 1)  # +1 header
    for r in range(rows + 1):
        _line(c, x, y + r*row_h, x + w, y + r*row_h, 1)

    # Linhas verticais (OBS / DATA)
    cx = x
    _line(c, cx + col_obs, y, cx + col_obs, y + h, 1)
    _line(c, cx + col_obs + col_data, y, cx + col_obs + col_data, y + h, 1)

    # AMD cols
    start_amd = cx + col_obs + col_data
    for i in range(total_amd_cols + 1):
        _line(c, start_amd + i*col_amd, y, start_amd + i*col_amd, y + h, 0.8)

    # Header labels
    hy = y + h - row_h + 6
    _txt(c, x + 6, hy, "OBSERVAÇÃO", 8, True)
    _txt(c, x + col_obs + 6, hy, "DATA", 8, True)

    # A/M/D labels repetidos
    for b in range(blocks):
        base = start_amd + (b*3)*col_amd
        _txt(c, base + 8, hy, "A", 8, True)
        _txt(c, base + col_amd + 8, hy, "M", 8, True)
        _txt(c, base + 2*col_amd + 8, hy, "D", 8, True)

    # Retorna coordenadas úteis para preenchimento da 1ª linha de dados
    first_row_y = y + h - 2*row_h + 6
    return {
        "row_h": row_h,
        "start_amd": start_amd,
        "col_obs": col_obs,
        "col_data": col_data,
        "col_amd": col_amd,
        "first_row_y": first_row_y,
        "x": x,
        "y": y,
        "w": w,
        "h": h,
    }

def _draw_demo_box(c: canvas.Canvas, x: float, y: float, w: float, h: float):
    _center(c, y + h + 10, "DEMONSTRAÇÃO", 11, True)
    _rect(c, x, y, w, h, 1)

    # linhas pontilhadas internas (como no impresso)
    lines = 6
    gap = h / (lines + 1)
    for i in range(1, lines + 1):
        yy = y + h - i*gap
        _dotted_line(c, x + 10, yy, x + w - 10)

    # rótulos “Prestações” e “O Informante”
    _txt(c, x + w - 140, y + 10, "Prestações", 9, False)
    _center(c, y - 15, "O Informante", 10, False)

    # coordenadas para escrever texto livre na demonstração
    return {
        "x": x,
        "y": y,
        "w": w,
        "h": h,
        "top": y + h,
        "gap": gap
    }

def generate_certidao_pdf_clean(
    *,
    nome: str,
    categoria: str,
    classe: str,
    escalao: str,

    inicio_funcoes: date,
    fim_funcoes: date,

    serv_anos: int, serv_meses: int, serv_dias: int,

    nd_inicio: date | None,
    nd_fim: date | None,
    nd_anos: int, nd_meses: int, nd_dias: int,

    salario_pensionavel: float,
    valor_mensal: float,
    valor_diario: float,
    meses_totais: int,
    encargo_meses: float,
    encargo_dias: float,
    encargo_total: float,

    n_prestacoes: int,
    valor_prestacao: float,
) -> bytes:
    buf = BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)

    # ===== Layout base (limpo)
    _draw_header(c)

    id_y = PAGE_H - 140
    _draw_identity_line(c, id_y)

    # Preenche identidade (por cima das linhas pontilhadas)
    _txt(c, 78, id_y, (nome or "")[:40], 10, False)
    _txt(c, 385, id_y, (categoria or "")[:10], 10, False)
    _txt(c, 512, id_y, (classe or "")[:8], 10, False)
    _txt(c, 565, id_y, (escalao or "")[:6], 10, False)

    # ===== Tabela: Contagem de tempo
    t1 = _draw_time_table(c, "CONTAGEM DE TEMPO", x=40, y=PAGE_H-370, w=PAGE_W-80, h=140, rows=5)

    # Escrever 2 linhas no início (como o exemplo)
    # Linha 1: início + TSAE + AMD serviço
    y1 = t1["first_row_y"]
    _txt(c, t1["x"] + 6, y1, "TSAE", 10, False)
    _txt(c, t1["x"] + t1["col_obs"] + 6, y1, _fmt_date(inicio_funcoes), 10, False)

    amd_x = t1["start_amd"]
    cw = t1["col_amd"]
    _txt(c, amd_x + 6, y1, f"{serv_anos:02d}", 10, False)
    _txt(c, amd_x + cw + 6, y1, f"{serv_meses:02d}", 10, False)
    _txt(c, amd_x + 2*cw + 6, y1, f"{serv_dias:02d}", 10, False)

    # Linha 2: fim
    y2 = y1 - t1["row_h"]
    _txt(c, t1["x"] + t1["col_obs"] + 6, y2, _fmt_date(fim_funcoes), 10, False)
    _txt(c, amd_x + 6, y2, "00", 10, False)
    _txt(c, amd_x + cw + 6, y2, "00", 10, False)
    _txt(c, amd_x + 2*cw + 6, y2, "00", 10, False)

    # ===== Tabela: Encargos (tempo não descontado)
    t2 = _draw_time_table(c, "ENCARGOS", x=40, y=PAGE_H-560, w=PAGE_W-80, h=110, rows=4)

    y1e = t2["first_row_y"]
    _txt(c, t2["x"] + 6, y1e, "TSND", 10, False)

    amd_x2 = t2["start_amd"]
    cw2 = t2["col_amd"]

    if nd_inicio and nd_fim:
        _txt(c, t2["x"] + t2["col_obs"] + 6, y1e, _fmt_date(nd_inicio), 10, False)
        _txt(c, amd_x2 + 6, y1e, f"{nd_anos:02d}", 10, False)
        _txt(c, amd_x2 + cw2 + 6, y1e, f"{nd_meses:02d}", 10, False)
        _txt(c, amd_x2 + 2*cw2 + 6, y1e, f"{nd_dias:02d}", 10, False)

        y2e = y1e - t2["row_h"]
        _txt(c, t2["x"] + t2["col_obs"] + 6, y2e, _fmt_date(nd_fim), 10, False)
        _txt(c, amd_x2 + 6, y2e, "00", 10, False)
        _txt(c, amd_x2 + cw2 + 6, y2e, "00", 10, False)
        _txt(c, amd_x2 + 2*cw2 + 6, y2e, "00", 10, False)
    else:
        _txt(c, t2["x"] + t2["col_obs"] + 6, y1e, "", 10, False)
        _txt(c, amd_x2 + 6, y1e, "00", 10, False)
        _txt(c, amd_x2 + cw2 + 6, y1e, "00", 10, False)
        _txt(c, amd_x2 + 2*cw2 + 6, y1e, "00", 10, False)

    # ===== Demonstração
    demo = _draw_demo_box(c, x=40, y=60, w=PAGE_W-80, h=170)
    top = demo["top"]
    g = demo["gap"]

    # Linhas de demonstração (texto completo, como no manuscrito)
    l1 = f"A{nd_anos:02d}.. M{nd_meses:02d}.. D{nd_dias:02d}   →   ({nd_anos:02d}×12 + {nd_meses:02d}) = {meses_totais} meses e {nd_dias} dias"
    l2 = f"{_money_pt(salario_pensionavel)} × 7% = {_money_pt(valor_mensal)}   ;   {_money_pt(valor_mensal)} × {meses_totais} = {_money_pt(encargo_meses)}"
    l3 = f"{_money_pt(valor_mensal)} / 30 = {_money_pt(valor_diario)}   ;   {_money_pt(valor_diario)} × {nd_dias} = {_money_pt(encargo_dias)}"
    l4 = f"TOTAL:  {_money_pt(encargo_meses)} + {_money_pt(encargo_dias)} = {_money_pt(encargo_total)}"
    if n_prestacoes > 0:
        l5 = f"{n_prestacoes} prestações  |  1ª: {_money_pt(valor_prestacao)} Mt  |  Restantes: {_money_pt(valor_prestacao)} Mt"
    else:
        l5 = "Sem prestações (encargo total = 0)"

    _txt(c, 55, top - 1*g + 4, l1, 9, False)
    _txt(c, 55, top - 2*g + 4, l2, 9, False)
    _txt(c, 55, top - 3*g + 4, l3, 9, False)
    _txt(c, 55, top - 4*g + 4, l4, 9, True)
    _txt(c, 55, top - 5*g + 4, l5, 9, False)

    c.showPage()
    c.save()
    buf.seek(0)
    return buf.getvalue()
