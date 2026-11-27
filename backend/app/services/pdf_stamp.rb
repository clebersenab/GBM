require "prawn"
require "combine_pdf"
Prawn::Fonts::AFM.hide_m17n_warning = true

# Carimba cada página do PDF com o nome e o e-mail de quem baixou, no rodapé, em letra pequena e
# discreta. Não impede o uso; inibe o repasse do arquivo para fora da família.
class PdfStamp
  def self.label_for(account)
    quem = account.name.presence || "esta família"
    "Cópia exclusiva de #{quem} · #{account.email} · Para uso da família"
  end

  # source: caminho ou conteúdo (String binária) do PDF; devolve o PDF carimbado (String binária)
  def self.call(source, label)
    pdf = File.exist?(source.to_s) ? CombinePDF.load(source) : CombinePDF.parse(source)
    texto = seguro(label)
    carimbos = {}
    pdf.pages.each do |page|
      x0, y0, x1, y1 = page.mediabox
      w = x1 - x0
      h = y1 - y0
      carimbos[[w, h]] ||= CombinePDF.parse(carimbo(w, h, texto)).pages[0]
      page << carimbos[[w, h]]
    end
    pdf.to_pdf
  end

  # As fontes padrão do PDF só têm o alfabeto latino (Windows-1252): o resto vira nada.
  def self.seguro(texto)
    texto.encode("Windows-1252", invalid: :replace, undef: :replace, replace: "").encode("UTF-8")
  end

  def self.carimbo(w, h, texto)
    Prawn::Document.new(page_size: [w, h], margin: 0) do |d|
      tamanho = [[w / 90.0, 6].max, 9].min
      d.font("Helvetica", size: tamanho)
      d.fill_color "808080"
      d.transparent(0.55) do
        d.text_box texto, at: [0, tamanho * 2.2], width: w, height: tamanho * 1.6, align: :center, overflow: :shrink_to_fit
      end
    end.render
  end
  private_class_method :carimbo
end
