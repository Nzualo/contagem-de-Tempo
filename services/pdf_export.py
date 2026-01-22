from __future__ import annotations
from io import BytesIO
from datetime import date
import fitz  # PyMuPDF
from reportlab.pdfgen import canvas

# ==========================================================
# POSIÇÕES (frações da página) — ajuste fino se precisar
# (0,0) = canto inferior esquerdo
# ==========================================================
POS = {
    # Topo: Nome / Categoria / Classe / Escalão
    "nome":      (0.10, 0.835),
    "categoria": (0.54, 0.835),
    "classe":    (0.70, 0.835),
    "escalao":   (0.84, 0.835),

    # CONTAGEM DE TEMPO — linha 1
    "ct_obs1":  (0.06, 0.735),   # OBSERVAÇÃO (TSAE)
    "ct_data1": (0.17, 0.735),
    "ct_a1":    (0.28, 0.735),
    "ct_m1":    (0.31, 0.735),
    "ct_d1":    (0.34, 0.735),

    # CONTAGEM DE TEMPO — linha 2
    "ct_obs2":  (0.06, 0.685),
    "ct_data2": (0.17, 0.685),
    "ct_a2":    (0.28, 0.685),
    "ct_m2":    (0.31, 0.685),
    "ct_d2":    (0.34, 0.685),

    # ENCARGOS — linha 1
    "enc_obs1":  (0.06, 0.415),  # OBSERVAÇÃO (TSND)
    "enc_data1": (0.17, 0.415),
    "enc_a1":    (0.28, 0.415),
    "enc_m1":    (0.31, 0.415),
    "enc_d1":    (0.34, 0.415),

    # ENCARGOS — linha 2
    "enc_obs2":  (0.06, 0.365),
    "enc_data2": (0.17, 0.365),
    "enc_a2":    (0.28, 0.365),
    "enc_m2":    (0.31, 0.365),
    "enc_d2":    (0.34, 0.365),

    # DEMONSTRAÇÃO — linhas (texto completo)
    "demo_l1": (0.05, 0.235),  # A.. M.. D.. x12 + .. = ..
    "demo_l2": (0.05, 0.200),  # salário x7% = mensal  ; mensal x meses = ...
    "demo_l3": (0.05, 0.168),  # mensal/30 = diário    ; diário x dias = ...
    "demo_l4": (0.05, 0.136),  # total = ...
    "demo_l5": (0.05, 0.105),  # Nº prestações e 1ª/Restantes

    # TOTAL grande e prestações (número)
    "total_big": (0.15, 0.124),
    "n_prest":   (0.73, 0.124),
}

def _fmt_date(d: date) -> str:
    return d.strftime("%d/%m/%Y")

def _money_pt(x: float) -> str:
    s = f"{x:,.2f}"
    return s.replace(",", "X").replace(".", ",").replace("X", ".")

def _xy(page_w: float, page_h: float, key: str) -> tuple[float, float]:
    xf, yf = POS[key]
    return page_w * xf, page_h * yf

def _draw(c: canvas.Canvas, page_w: float, page_h: float, key: str, text: str, size: int = 11):
    x, y = _xy(page_w, page_h, key)
    c.setFont("Helvetica", size)
    c.drawString(x, y, text)

def generate_certidao_pdf(
    template_pdf_path: str,
    *,
    nome: str,
    categoria: str,
    classe: str,
    escalao: str,

    inicio_funcoes: date,
    fim_funcoes: date,

    # tempo de serviço
    serv_anos: int, serv_meses: int, serv_dias: int,

    # tempo não descontado (para encargos)
    nd_inicio: date | None,
    nd_fim: date | None,
    nd_anos: int, nd_meses: int, nd_dias: int,

    salario_pensionavel: float,
    valor_mensal: float,
    valor_diario: float,
    meses_totais: int,       # (anos*12+meses)
    encargo_meses: float,    # mensal * meses_totais
    encargo_dias: float,     # diário * dias
    encargo_total: float,

    n_prestacoes: int,
    valor_prestacao: float,
) -> bytes:

    template = fitz.open(template_pdf_path)
    page = template[0]
    rect = page.rect
    page_w, page_h = rect.width, rect.height

    overlay_buf = BytesIO()
    c = canvas.Canvas(overlay_buf, pagesize=(page_w, page_h))

    # ===== Topo
    _draw(c, page_w, page_h, "nome", (nome or "")[:60], 11)
    _draw(c, page_w, page_h, "categoria", (categoria or "")[:12], 11)
    _draw(c, page_w, page_h, "classe", (classe or "")[:12], 11)
    _draw(c, page_w, page_h, "escalao", (escalao or "")[:6], 11)

    # ===== Contagem de Tempo (TSAE)
    _draw(c, page_w, page_h, "ct_obs1", "TSAE", 11)
    _draw(c, page_w, page_h, "ct_data1", _fmt_date(inicio_funcoes), 11)
    _draw(c, page_w, page_h, "ct_a1", f"{serv_anos:02d}", 11)
    _draw(c, page_w, page_h, "ct_m1", f"{serv_meses:02d}", 11)
    _draw(c, page_w, page_h, "ct_d1", f"{serv_dias:02d}", 11)

    _draw(c, page_w, page_h, "ct_obs2", "", 11)
    _draw(c, page_w, page_h, "ct_data2", _fmt_date(fim_funcoes), 11)
    _draw(c, page_w, page_h, "ct_a2", "00", 11)
    _draw(c, page_w, page_h, "ct_m2", "00", 11)
    _draw(c, page_w, page_h, "ct_d2", "00", 11)

    # ===== Encargos (TSND)
    _draw(c, page_w, page_h, "enc_obs1", "TSND", 11)
    if nd_inicio and nd_fim:
        _draw(c, page_w, page_h, "enc_data1", _fmt_date(nd_inicio), 11)
        _draw(c, page_w, page_h, "enc_a1", f"{nd_anos:02d}", 11)
        _draw(c, page_w, page_h, "enc_m1", f"{nd_meses:02d}", 11)
        _draw(c, page_w, page_h, "enc_d1", f"{nd_dias:02d}", 11)

        _draw(c, page_w, page_h, "enc_data2", _fmt_date(nd_fim), 11)
        _draw(c, page_w, page_h, "enc_a2", "00", 11)
        _draw(c, page_w, page_h, "enc_m2", "00", 11)
        _draw(c, page_w, page_h, "enc_d2", "00", 11)
    else:
        _draw(c, page_w, page_h, "enc_data1", "", 11)
        _draw(c, page_w, page_h, "enc_a1", "00", 11)
        _draw(c, page_w, page_h, "enc_m1", "00", 11)
        _draw(c, page_w, page_h, "enc_d1", "00", 11)

    # ===== Demonstração (texto completo, como no modelo)
    # Linha 1: A..M..D.. x12 + .. = meses_totais ; dias = ..
    # Exemplo manuscrito: A03 M04 D28 -> (3*12+4)=40 meses e 28 dias
    l1 = f"A{nd_anos:02d}.. M{nd_meses:02d}.. D{nd_dias:02d}  →  ({nd_anos:02d}×12 + {nd_meses:02d}) = {meses_totais}  meses  e  {nd_dias}  dias"
    _draw(c, page_w, page_h, "demo_l1", l1, 10)

    # Linha 2: salário ×7% = mensal ; mensal × meses = encargo_meses
    l2 = f"{_money_pt(salario_pensionavel)} × 7% = {_money_pt(valor_mensal)}   ;   {_money_pt(valor_mensal)} × {meses_totais} = {_money_pt(encargo_meses)}"
    _draw(c, page_w, page_h, "demo_l2", l2, 10)

    # Linha 3: mensal/30 = diário ; diário × dias = encargo_dias
    l3 = f"{_money_pt(valor_mensal)} / 30 = {_money_pt(valor_diario)}   ;   {_money_pt(valor_diario)} × {nd_dias} = {_money_pt(encargo_dias)}"
    _draw(c, page_w, page_h, "demo_l3", l3, 10)

    # Linha 4: total
    l4 = f"TOTAL:  {_money_pt(encargo_meses)}  +  {_money_pt(encargo_dias)}  =  {_money_pt(encargo_total)}"
    _draw(c, page_w, page_h, "demo_l4", l4, 11)

    # Linha 5: prestações (1ª e restantes)
    if n_prestacoes > 0:
        l5 = f"{n_prestacoes} prestações   |   1ª: {_money_pt(valor_prestacao)} Mt   |   Restantes: {_money_pt(valor_prestacao)} Mt"
    else:
        l5 = "Sem prestações (encargo total = 0)"
    _draw(c, page_w, page_h, "demo_l5", l5, 10)

    # Total grande e nº prestações no lugar de destaque (se existir no teu impresso)
    _draw(c, page_w, page_h, "total_big", _money_pt(encargo_total), 13)
    if n_prestacoes > 0:
        _draw(c, page_w, page_h, "n_prest", str(n_prestacoes), 12)

    c.showPage()
    c.save()
    overlay_buf.seek(0)

    overlay = fitz.open(stream=overlay_buf.getvalue(), filetype="pdf")
    page.show_pdf_page(page.rect, overlay, 0)

    out = BytesIO()
    template.save(out)
    template.close()
    overlay.close()
    return out.getvalue()
