# Importa o catálogo antigo (data/catalogo.json) para o banco, uma única vez por título.
# Depois disso o banco é a fonte: o admin edita pela administração e o seed não sobrescreve.
require "json"
catalogo = JSON.parse(File.read(Rails.root.join("..", "data", "catalogo.json")))
catalogo.fetch("titulos").each_with_index do |t, i|
  title = Title.find_or_initialize_by(slug: t["id"])
  next unless title.new_record? || title.sinopse.nil?
  title.assign_attributes(
    title: t["titulo"], pdf_path: title.pdf_path || "#{t['id']}.pdf", sinopse: t["sinopse"], obra_mae: t["obra_mae"] || {},
    valores: t["valores"] || [], caminhos: t["caminhos"] || [], fileiras: t["fileiras"] || [], colecoes: t["colecoes"] || [],
    box: t["box"], volume: t["volume"], vitrine: t.fetch("vitrine", true), lancamento: !!t["lancamento"], capa_path: t["capa"],
    status: "publicado", published_at: title.published_at || Time.current, position: i + 1
  )
  title.save!
end

# Páginas provisórias que já existiam em arquivo (content/livros/<slug>.json, exceto amostras).
Dir[Rails.root.join("content", "livros", "*.json")].each do |path|
  data = JSON.parse(File.read(path))
  next if data["amostra"]
  title = Title.find_by(slug: data["slug"])
  next if title.nil? || title.pages.exists?
  Title.transaction do
    data["paginas"].each_with_index do |p, i|
      title.pages.create!(position: i + 1, image_path: p["imagem"], text: p["texto"], parent_question: p["pergunta"])
    end
    title.update!(quiz: data["quiz"] || [], vocabulario: data["vocabulario"] || [])
  end
end
puts "#{Title.count} títulos (#{Title.published.count} publicados)"
