# Catálogo com "Em breve": títulos ainda não publicados que já aparecem para as famílias,
# com capa em preto e branco e sem leitura. Decisão de nov/2026: só o Moby Dick fica
# publicado; os demais títulos do catálogo voltam para "em edição" e aparecem como em breve.
class EmBreve < ActiveRecord::Migration[8.0]
  def up
    add_column :titles, :em_breve, :boolean, null: false, default: false
    execute <<~SQL.squish
      UPDATE titles SET status = 'em_edicao', em_breve = TRUE, updated_at = NOW()
      WHERE status = 'publicado' AND slug <> 'moby-dick'
    SQL
  end

  def down
    execute "UPDATE titles SET status = 'publicado' WHERE em_breve = TRUE AND status = 'em_edicao'"
    remove_column :titles, :em_breve
  end
end
