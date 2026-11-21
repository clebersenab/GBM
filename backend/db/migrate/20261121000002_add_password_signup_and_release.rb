class AddPasswordSignupAndRelease < ActiveRecord::Migration[8.0]
  def change
    change_table :accounts do |t|
      t.string :password_digest
      t.string :phone                      # WhatsApp, opcional
      t.datetime :terms_accepted_at        # aceite dos termos e da privacidade (LGPD)
      t.boolean :marketing_opt_in, null: false, default: false
      # Liberação manual pelo admin, independente de pagamento.
      t.string :access_status, null: false, default: "cadastrado"   # cadastrado | liberado | bloqueado
      t.datetime :access_from
      t.datetime :access_until
    end
    add_column :login_codes, :purpose, :string, null: false, default: "password_reset"
  end
end
