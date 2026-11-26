# Catálogo público da plataforma: títulos publicados (do banco) + listas fixas do arquivo
# (valores, jornadas, categorias da landing e grupos). Os livros de cada box e coleção
# saem do banco, então uma história nova entra no box assim que é publicada.
class Catalog
  FILE = Rails.root.join("..", "data", "catalogo.json")

  def self.file = @file ||= JSON.parse(File.read(FILE))
  def self.static = @static ||= file.except("titulos")
  def self.originais = @originais ||= file["titulos"].map { |t| t["id"] }.to_set

  def self.build(base)
    titles = Title.visible.includes(:cover_image).order(:position, :id).to_a
    views = titles.map { |t| t.catalog_view(base) }
    published = titles.index_by(&:slug) # visíveis no catálogo (publicados + em breve)
    s = static
    grupos = s["grupos"].map do |g|
      membros = if g["tipo"] == "box"
                  titles.select { |t| t.box == g["id"] }.sort_by { |t| [t.volume || 99, t.position] }.map(&:slug)
                else
                  old = g["titulos"].select { |id| published[id]&.colecoes&.include?(g["id"]) }
                  old + titles.select { |t| t.colecoes.include?(g["id"]) && !old.include?(t.slug) }.map(&:slug)
                end
      g.merge("titulos" => membros)
    end
    # Lançamentos: os livros já publicados vêm primeiro, o publicado mais recentemente na frente
    # (o primeiro vira o banner do Início). Depois, os que estão "em breve", na ordem antiga do
    # catálogo, e por fim os criados na administração que ainda não foram publicados.
    lanc = titles.select(&:lancamento)
    no_ar = lanc.select { |t| t.status == "publicado" }.sort_by { |t| -(t.published_at || t.created_at).to_f }.map(&:slug)
    fixos = s["lancamentos_ordem"].select { |id| published[id]&.lancamento }
    novos = lanc.reject { |t| originais.include?(t.slug) }.sort_by { |t| -(t.published_at || t.created_at).to_f }.map(&:slug)
    s.merge("titulos" => views, "grupos" => grupos, "lancamentos_ordem" => (no_ar + fixos + novos).uniq)
  end
end
