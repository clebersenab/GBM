# Leitor: página onde a criança parou, resultado do quiz e o diário da leitura.
class AddReaderProgress < ActiveRecord::Migration[8.0]
  def change
    add_column :reading_entries, :page, :integer, null: false, default: 0
    add_column :reading_entries, :pages_total, :integer
    add_column :reading_entries, :quiz_score, :integer
    add_column :reading_entries, :quiz_total, :integer
    add_column :reading_entries, :diary, :text
  end
end
