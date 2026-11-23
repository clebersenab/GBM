# Cadastro de histórias no banco: o catálogo inteiro passa a morar aqui.
# Fluxo: rascunho (admin) -> em_edicao (editor) -> em_revisao -> publicado (admin).
class StoryAdmin < ActiveRecord::Migration[8.0]
  def change
    add_column :accounts, :editor, :boolean, null: false, default: false

    create_table :stored_images do |t|
      t.references :account, foreign_key: true
      t.string :content_type, null: false
      t.binary :data, null: false
      t.integer :byte_size, null: false
      t.integer :width
      t.integer :height
      t.timestamps
    end

    change_table :titles, bulk: true do |t|
      t.text :sinopse
      t.jsonb :obra_mae, null: false, default: {}
      t.string :valores, array: true, null: false, default: []
      t.string :caminhos, array: true, null: false, default: []
      t.string :fileiras, array: true, null: false, default: []
      t.string :colecoes, array: true, null: false, default: []
      t.string :box
      t.integer :volume
      t.boolean :vitrine, null: false, default: true
      t.boolean :lancamento, null: false, default: false
      t.string :capa_path
      t.references :cover_image, foreign_key: { to_table: :stored_images }
      t.string :status, null: false, default: "rascunho"
      t.references :editor, foreign_key: { to_table: :accounts }
      t.text :review_note
      t.jsonb :quiz, null: false, default: []
      t.jsonb :vocabulario, null: false, default: []
      t.integer :position
      t.datetime :published_at
      t.index :status
    end

    create_table :book_pages do |t|
      t.references :title, null: false, foreign_key: true
      t.integer :position, null: false
      t.references :image, foreign_key: { to_table: :stored_images }
      t.string :image_path
      t.text :text, null: false, default: ""
      t.text :parent_question
      t.timestamps
      t.index %i[title_id position], unique: true
    end
  end
end
