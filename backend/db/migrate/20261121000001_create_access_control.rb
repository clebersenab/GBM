class CreateAccessControl < ActiveRecord::Migration[8.0]
  def change
    enable_extension "citext"

    # Conta da família: só o adulto responsável faz login.
    create_table :accounts do |t|
      t.citext :email, null: false
      t.string :name
      t.string :pin_digest          # PIN dos pais (bcrypt)
      t.boolean :admin, null: false, default: false
      t.timestamps
    end
    add_index :accounts, :email, unique: true

    # Código de 6 dígitos enviado por e-mail (login sem senha).
    create_table :login_codes do |t|
      t.citext :email, null: false
      t.string :code_digest, null: false
      t.datetime :expires_at, null: false
      t.integer :attempts, null: false, default: 0
      t.datetime :consumed_at
      t.timestamps
    end
    add_index :login_codes, [:email, :created_at]

    # Sessão por aparelho. Guardamos só o hash do token.
    create_table :sessions do |t|
      t.references :account, null: false, foreign_key: true
      t.string :token_digest, null: false
      t.string :user_agent
      t.string :ip
      t.datetime :expires_at, null: false
      t.datetime :last_used_at
      t.datetime :parent_unlocked_until   # janela liberada pelo PIN dos pais
      t.datetime :revoked_at
      t.timestamps
    end
    add_index :sessions, :token_digest, unique: true

    # Perfis das crianças. Sem login, sem sobrenome, sem data de nascimento (LGPD).
    create_table :child_profiles do |t|
      t.references :account, null: false, foreign_key: true
      t.string :name, null: false
      t.string :avatar, null: false, default: "raposa"
      t.string :age_band, null: false, default: "3-5"
      t.timestamps
    end

    # Assinatura. Sem gateway por enquanto: o admin ou um código de ativação alimentam estes campos.
    create_table :subscriptions do |t|
      t.references :account, null: false, foreign_key: true, index: { unique: true }
      t.string :plan, null: false, default: "mensal"
      t.string :status, null: false, default: "active"
      t.string :source, null: false, default: "admin"
      t.datetime :current_period_end, null: false
      t.datetime :canceled_at
      t.timestamps
    end

    create_table :titles do |t|
      t.string :slug, null: false
      t.string :title, null: false
      t.string :pdf_path
      t.timestamps
    end
    add_index :titles, :slug, unique: true

    # Livros que a família baixou: são dela para sempre.
    create_table :downloads do |t|
      t.references :account, null: false, foreign_key: true
      t.references :title, null: false, foreign_key: true
      t.datetime :first_downloaded_at, null: false
      t.datetime :last_downloaded_at, null: false
      t.integer :count, null: false, default: 1
      t.timestamps
    end
    add_index :downloads, [:account_id, :title_id], unique: true

    # Plano vendido em loja parceira: o cliente ativa o código no site.
    create_table :activation_codes do |t|
      t.string :code, null: false
      t.integer :months, null: false
      t.string :store
      t.datetime :expires_at
      t.references :redeemed_by, foreign_key: { to_table: :accounts }
      t.datetime :redeemed_at
      t.timestamps
    end
    add_index :activation_codes, :code, unique: true
  end
end
