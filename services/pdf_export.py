from __future__ import annotations
from io import BytesIO
from datetime import date
from typing import List, Optional

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


def _wrap_text(c: canvas.Canvas, text: str, max_width: float, font_name="Helvetica", font_size=9) -> List[str]:
    """
    Wrap simples por palavras para não estourar a largura do quadro.
    """
    c.setFont(font_name, font_size)
    words = text.split()
    lines = []
    cur = ""
    for w in words:
        test = (cur + " " + w).strip()
        if c.stringWidth(test, font_name, font_size) <= max_width:
            cur = test
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def _draw_header(c: canvas.Canvas):
    c.setStrokeColor(colors.black)
    c.setLineWidth(1)
    c.circle(PAGE_W / 2, PAGE_H - 55, 16)

    _center(c, PAGE_H - 80, "REPÚBLICA DE MOÇAMBIQUE", 12, True)
    _center(c, PAGE_H - 95, "GOVERNO DO DISTRITO DE INHASSORO", 10, True)
    _center(c, PAGE_H - 110, "SERVIÇO DISTRITAL DE EDUCAÇÃO JUVENTUDE E TECNOLOGIA", 10, True)


def _draw_identity_line(c: canvas.Canvas, y: float):
    _txt(c, 40, y, "Nome:", 10, False)
    _dotted_line(c, 75, y - 2, 300)

    _txt(c, 320, y, "Categoria:", 10, False)
    _dotted_line(c, 380, y - 2, 455)

    _txt(c, 465, y, "Classe:", 10, False)
    _dotted_line(c, 510, y - 2, 555)

    _txt(c, 560, y, "Escalão:", 10, False)


def _draw_time_table(c: canvas.Canvas, title: str, x: float, y: float, w: float, h: float, rows: int = 6):
    _center(c, y + h + 10, title, 11, True)
    _rect(c, x, y, w, h, 1)

    col_obs = 110
    col_data = 70
    col_amd = 30
    blocks = 5
    total_amd_cols = blocks * 3

    used = col_obs + col_data + total_amd_cols * col_amd
    if used > w:
        col_amd = (w - col_obs - col_data) / (total_amd_cols)

    row_h = h / (rows + 1)

    for r in range(rows + 1):
        _line(c, x, y + r * row_h, x + w, y + r * row_h, 1)

    _line(c, x + col_obs, y, x + col_obs, y + h, 1)
    _line(c, x + col_obs + col_data, y, x + col_obs + col_data, y + h, 1)

    start_amd = x + col_obs + col_data
    for i in range(total_amd_cols + 1):
        _line(c, start_amd + i * col_amd, y, start_amd + i * col_amd, y + h, 0.8)

    hy = y + h - row_h + 6
    _txt(c, x + 6, hy, "OBSERVAÇÃO", 8, True)
    _txt(c, x + col_obs + 6, hy, "DATA", 8, True)

    for b in range(blocks):
        base = start_amd + (b * 3) * col_amd
        _txt(c, base + 8, hy, "A", 8, True)
        _txt(c, base + col_amd + 8, hy, "M", 8, True)
        _txt(c, base + 2 * col_amd + 8, hy, "D", 8, True)

    first_row_y = y + h - 2 * row_h + 6
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

    lines = 7
    gap = h / (lines + 1)
    for i in range(1, lines + 1):
        yy = y + h - i * gap
        _dotted_line(c, x + 10, yy, x + w - 10)

    _txt(c, x + w - 140, y + 10, "Prestações", 9, False)
    _center(c, y - 15, "O Informante", 10, False)

    return {"x": x, "y": y, "w": w, "h": h, "top": y + h, "gap": gap}


def generate_certidao_pdf_clean(
    *,
    nome: str,
    categoria: str,
    classe: str,
    escalao: str,

    inicio_funcoes: date,
    fim_funcoes: date,

    serv_anos: int, serv_meses: int, serv_dias: int,

    nd_inicio: Optional[date],
    nd_fim: Optional[date],
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

    demo_lines: Optional[List[str]] = None,
) -> bytes:
    buf = BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)

    _draw_header(c)

    id_y = PAGE_H - 140
    _draw_identity_line(c, id_y)

    _txt(c, 78, id_y, (nome or "")[:40], 10, False)
    _txt(c, 385, id_y, (categoria or "")[:10], 10, False)
    _txt(c, 512, id_y, (classe or "")[:8], 10, False)
    _txt(c, 565, id_y, (escalao or "")[:6], 10, False)

    # CONTAGEM DE TEMPO
    t1 = _draw_time_table(c, "CONTAGEM DE TEMPO", x=40, y=PAGE_H - 370, w=PAGE_W - 80, h=140, rows=5)
    y1 = t1["first_row_y"]

    _txt(c, t1["x"] + 6, y1, "TSAE", 10, False)
    _txt(c, t1["x"] + t1["col_obs"] + 6, y1, _fmt_date(inicio_funcoes), 10, False)

    amd_x = t1["start_amd"]
    cw = t1["col_amd"]
    _txt(c, amd_x + 6, y1, f"{serv_anos:02d}", 10, False)
    _txt(c, amd_x + cw + 6, y1, f"{serv_meses:02d}", 10, False)
    _txt(c, amd_x + 2 * cw + 6, y1, f"{serv_dias:02d}", 10, False)

    y2 = y1 - t1["row_h"]
    _txt(c, t1["x"] + t1["col_obs"] + 6, y2, _fmt_date(fim_funcoes), 10, False)
    _txt(c, amd_x + 6, y2, "00", 10, False)
    _txt(c, amd_x + cw + 6, y2, "00", 10, False)
    _txt(c, amd_x + 2 * cw + 6, y2, "00", 10, False)

    # ENCARGOS (TSND)
    t2 = _draw_time_table(c, "ENCARGOS", x=40, y=PAGE_H - 560, w=PAGE_W - 80, h=110, rows=4)
    y1e = t2["first_row_y"]
    _txt(c, t2["x"] + 6, y1e, "TSND", 10, False)

    amd_x2 = t2["start_amd"]
    cw2 = t2["col_amd"]

    if nd_inicio and nd_fim:
        _txt(c, t2["x"] + t2["col_obs"] + 6, y1e, _fmt_date(nd_inicio), 10, False)
        _txt(c, amd_x2 + 6, y1e, f"{nd_anos:02d}", 10, False)
        _txt(c, amd_x2 + cw2 + 6, y1e, f"{nd_meses:02d}", 10, False)
        _txt(c, amd_x2 + 2 * cw2 + 6, y1e, f"{nd_dias:02d}", 10, False)

        y2e = y1e - t2["row_h"]
        _txt(c, t2["x"] + t2["col_obs"] + 6, y2e, _fmt_date(nd_fim), 10, False)
        _txt(c, amd_x2 + 6, y2e, "00", 10, False)
        _txt(c, amd_x2 + cw2 + 6, y2e, "00", 10, False)
        _txt(c, amd_x2 + 2 * cw2 + 6, y2e, "00", 10, False)
    else:
        _txt(c, amd_x2 + 6, y1e, "00", 10, False)
        _txt(c, amd_x2 + cw2 + 6, y1e, "00", 10, False)
        _txt(c, amd_x2 + 2 * cw2 + 6, y1e, "00", 10, False)

    # DEMONSTRAÇÃO
    demo = _draw_demo_box(c, x=40, y=60, w=PAGE_W - 80, h=170)

    if not demo_lines:
        # fallback determinístico
        demo_lines = [
            f"A{nd_anos:02d}.. M{nd_meses:02d}.. D{nd_dias:02d}  →  ({nd_anos:02d}×12 + {nd_meses:02d}) = {meses_totais} meses e {nd_dias} dias",
            f"{_money_pt(salario_pensionavel)} × 7% = {_money_pt(valor_mensal)}",
            f"{_money_pt(valor_mensal)} × {meses_totais} = {_money_pt(encargo_meses)}",
            f"{_money_pt(valor_mensal)} / 30 = {_money_pt(valor_diario)} ; {_money_pt(valor_diario)} × {nd_dias} = {_money_pt(encargo_dias)}",
            f"TOTAL: {_money_pt(encargo_meses)} + {_money_pt(encargo_dias)} = {_money_pt(encargo_total)}",
            f"{n_prestacoes} prestações | 1ª: {_money_pt(valor_prestacao)} Mt | restantes: {_money_pt(valor_prestacao)} Mt",
        ]

    # escreve com wrap para não estourar
    left = demo["x"] + 15
    right = demo["x"] + demo["w"] - 15
    maxw = right - left
    y = demo["top"] - demo["gap"] + 4

    c.setFont("Helvetica", 9)
    for raw in demo_lines[:8]:
        wrapped = _wrap_text(c, raw, maxw, font_name="Helvetica", font_size=9)
        for ln in wrapped:
            _txt(c, left, y, ln, 9, False)
            y -= demo["gap"] * 0.75
        y -= 2  # pequeno espaçamento extra

    c.showPage()
    c.save()

    buf.seek(0)
    return buf.getvalue()
