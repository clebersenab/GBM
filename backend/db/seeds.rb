# Carrega os títulos a partir do catálogo da landing (data/catalogo.json).
require "json"
catalogo = JSON.parse(File.read(Rails.root.join("..", "data", "catalogo.json")))
catalogo.fetch("titulos").each do |t|
  Title.find_or_initialize_by(slug: t["id"]).update!(title: t["titulo"], pdf_path: "#{t['id']}.pdf")
end
puts "#{Title.count} títulos"
