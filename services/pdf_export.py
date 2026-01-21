from __future__ import annotations
from io import BytesIO
from datetime import date
import fitz  # PyMuPDF
from reportlab.pdfgen import canvas


# ==========================================================
# POSIÇÕES (ajuste fino se necessário)
# ==========================================================
# As posições estão em FRAÇÕES da página para ficar robusto
# mesmo com variação de tamanho do scan.
#
# Se algum campo ficar 2-5mm fora, ajuste só estes valores.
# (x_frac, y_frac) onde (0,0)=canto inferior esquerdo.
#
POS = {
    # Linha superior: Nome / Categoria / Classe / Escalão
    "nome":      (0.09, 0.835),
    "categoria": (0.52, 0.835),
    "classe":    (0.69, 0.835),
    "escalao":   (0.83, 0.835),

    # CONTAGEM DE TEMPO (2 primeiras linhas)
    "ct_data1": (0.18, 0.735),
    "ct_a1":    (0.33, 0.735),
    "ct_m1":    (0.37, 0.735),
    "ct_d1":    (0.41, 0.735),

    "ct_data2": (0.18, 0.685),
    "ct_a2":    (0.33, 0.685),
    "ct_m2":    (0.37, 0.685),
    "ct_d2":    (0.41, 0.685),

    # ENCARGOS (2 primeiras linhas)
    "enc_data1": (0.18, 0.415),
    "enc_a1":    (0.33, 0.415),
    "enc_m1":    (0.37, 0.415),
    "enc_d1":    (0.41, 0.415),

    "enc_data2": (0.18, 0.365),
    "enc_a2":    (0.33, 0.365),
    "enc_m2":    (0.37, 0.365),
    "enc_d2":    (0.41, 0.365),

    # DEMONSTRAÇÃO (linha A/M/D grande)
    "demo_anos": (0.06, 0.245),
    "demo_meses":(0.15, 0.245),
    "demo_dias": (0.24, 0.245),

    # Remuneração e cálculo 7%
    "salario":   (0.08, 0.205),
    "mensal":    (0.25, 0.205),

    # mensal * meses  /  diário * dias
    "enc_meses": (0.67, 0.205),
    "diario":    (0.25, 0.175),
    "enc_dias":  (0.67, 0.175),

    # Total grande
    "total":     (0.16, 0.135),

    # Prestações (número e valor)
    "n_prest":     (0.70, 0.135),
    "valor_prest": (0.19, 0.095),
    "valor_rest":  (0.19, 0.065),
}


def _fmt_date(d: date) -> str:
    return d.strftime("%d/%m/%Y")

def _money_pt(x: float) -> str:
    # 12.345,67
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
    # topo
    nome: str,
    categoria: str,
    classe: str,
    escalao: str,

    # serviço
    inicio_funcoes: date,
    fim_funcoes: date,
    serv_anos: int, serv_meses: int, serv_dias: int,

    # não descontado
    nd_inicio: date | None,
    nd_fim: date | None,
    nd_anos: int, nd_meses: int, nd_dias: int,

    # encargos
    salario_pensionavel: float,
    valor_mensal: float,
    valor_diario: float,
    encargo_meses: float,
    encargo_dias: float,
    encargo_total: float,

    # prestações
    n_prestacoes: int,
    valor_prestacao: float,
) -> bytes:
    """
    Retorna bytes do PDF final = template + overlay preenchido.
    """
    template = fitz.open(template_pdf_path)
    page = template[0]
    rect = page.rect
    page_w, page_h = rect.width, rect.height

    # 1) Overlay (reportlab) com o MESMO tamanho do template
    overlay_buf = BytesIO()
    c = canvas.Canvas(overlay_buf, pagesize=(page_w, page_h))

    # topo
    _draw(c, page_w, page_h, "nome", nome[:60], 11)
    _draw(c, page_w, page_h, "categoria", categoria[:10], 11)
    _draw(c, page_w, page_h, "classe", classe[:10], 11)
    _draw(c, page_w, page_h, "escalao", escalao[:5], 11)

    # contagem de tempo (serviço) - 2 linhas
    _draw(c, page_w, page_h, "ct_data1", _fmt_date(inicio_funcoes), 11)
    _draw(c, page_w, page_h, "ct_a1", f"{serv_anos:02d}", 11)
    _draw(c, page_w, page_h, "ct_m1", f"{serv_meses:02d}", 11)
    _draw(c, page_w, page_h, "ct_d1", f"{serv_dias:02d}", 11)

    _draw(c, page_w, page_h, "ct_data2", _fmt_date(fim_funcoes), 11)
    # (a segunda linha A/M/D pode ficar em branco, ou repetir/zerar conforme prática local)
    _draw(c, page_w, page_h, "ct_a2", "00", 11)
    _draw(c, page_w, page_h, "ct_m2", "00", 11)
    _draw(c, page_w, page_h, "ct_d2", "00", 11)

    # encargos (tempo não descontado) - 2 linhas
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
        # sem não descontado
        _draw(c, page_w, page_h, "enc_a1", "00", 11)
        _draw(c, page_w, page_h, "enc_m1", "00", 11)
        _draw(c, page_w, page_h, "enc_d1", "00", 11)

    # demonstração
    _draw(c, page_w, page_h, "demo_anos", f"{nd_anos:02d}", 12)
    _draw(c, page_w, page_h, "demo_meses", f"{nd_meses:02d}", 12)
    _draw(c, page_w, page_h, "demo_dias", f"{nd_dias:02d}", 12)

    _draw(c, page_w, page_h, "salario", _money_pt(salario_pensionavel), 12)
    _draw(c, page_w, page_h, "mensal", _money_pt(valor_mensal), 12)

    _draw(c, page_w, page_h, "enc_meses", _money_pt(encargo_meses), 12)
    _draw(c, page_w, page_h, "diario", _money_pt(valor_diario), 12)
    _draw(c, page_w, page_h, "enc_dias", _money_pt(encargo_dias), 12)

    _draw(c, page_w, page_h, "total", _money_pt(encargo_total), 14)

    _draw(c, page_w, page_h, "n_prest", str(n_prestacoes), 12)
    _draw(c, page_w, page_h, "valor_prest", _money_pt(valor_prestacao), 12)
    _draw(c, page_w, page_h, "valor_rest", _money_pt(valor_prestacao), 12)

    c.showPage()
    c.save()
    overlay_buf.seek(0)

    # 2) Mesclar overlay na página 0
    overlay = fitz.open(stream=overlay_buf.getvalue(), filetype="pdf")
    page.show_pdf_page(page.rect, overlay, 0)

    out = BytesIO()
    template.save(out)
    template.close()
    overlay.close()
    return out.getvalue()
