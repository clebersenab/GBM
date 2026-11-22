# Sem PIN; estante de cada criança; foco dos pais; sinais de interesse; cancelamento com NPS.
class LibraryFocusAndCancellation < ActiveRecord::Migration[8.0]
  def change
    remove_column :accounts, :pin_digest, :string
    remove_column :sessions, :parent_unlocked_until, :datetime
    add_column :accounts, :renewal_canceled_at, :datetime

    add_column :child_profiles, :focus_valores, :string, array: true, default: [], null: false
    add_column :child_profiles, :focus_caminhos, :string, array: true, default: [], null: false

    # Status de leitura por criança: quero_ler (não lido), lendo, lido; e se gostou.
    create_table :reading_entries do |t|
      t.references :child_profile, null: false, foreign_key: true
      t.references :title, null: false, foreign_key: true
      t.string :status, null: false
      t.boolean :liked
      t.datetime :started_at
      t.datetime :finished_at
      t.timestamps
    end
    add_index :reading_entries, %i[child_profile_id title_id], unique: true

    # Sinais implícitos: o que os pais exploram em "Plantar e cultivar".
    create_table :profile_signals do |t|
      t.references :child_profile, null: false, foreign_key: true
      t.string :kind, null: false # valor | caminho
      t.string :key, null: false
      t.integer :count, null: false, default: 0
      t.datetime :last_at, null: false
      t.timestamps
    end
    add_index :profile_signals, %i[child_profile_id kind key], unique: true

    create_table :cancellations do |t|
      t.references :account, null: false, foreign_key: true
      t.integer :nps_score, null: false
      t.string :reason
      t.text :comment
      t.datetime :reverted_at
      t.timestamps
    end
  end
end
