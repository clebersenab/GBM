# Leituras ao mesmo tempo: cada sessão (aparelho) marca até quando está lendo.
class AddReadingToSessions < ActiveRecord::Migration[8.0]
  def change
    add_column :sessions, :reading_until, :datetime
    add_column :sessions, :reading_slug, :string
    add_column :sessions, :reading_kicked_at, :datetime
  end
end
