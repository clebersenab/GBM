# "As Baquetas de Téo" virou "As Baquetas do Bento": o endereço do livro acompanha o título.
# Leituras, progresso e downloads se ligam ao livro pelo id, então nada se perde.
class RenameBaquetasSlug < ActiveRecord::Migration[8.0]
  def up
    execute "UPDATE titles SET slug = 'as-baquetas-do-bento', pdf_path = 'as-baquetas-do-bento.pdf' WHERE slug = 'as-baquetas-de-teo'"
  end

  def down
    execute "UPDATE titles SET slug = 'as-baquetas-de-teo', pdf_path = 'as-baquetas-de-teo.pdf' WHERE slug = 'as-baquetas-do-bento'"
  end
end
