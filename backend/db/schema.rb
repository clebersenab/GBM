# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.0].define(version: 2026_11_23_000001) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "citext"
  enable_extension "pg_catalog.plpgsql"

  create_table "accounts", force: :cascade do |t|
    t.citext "email", null: false
    t.string "name"
    t.boolean "admin", default: false, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "password_digest"
    t.string "phone"
    t.datetime "terms_accepted_at"
    t.boolean "marketing_opt_in", default: false, null: false
    t.string "access_status", default: "cadastrado", null: false
    t.datetime "access_from"
    t.datetime "access_until"
    t.string "theme"
    t.datetime "renewal_canceled_at"
    t.index ["email"], name: "index_accounts_on_email", unique: true
  end

  create_table "activation_codes", force: :cascade do |t|
    t.string "code", null: false
    t.integer "months", null: false
    t.string "store"
    t.datetime "expires_at"
    t.bigint "redeemed_by_id"
    t.datetime "redeemed_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["code"], name: "index_activation_codes_on_code", unique: true
    t.index ["redeemed_by_id"], name: "index_activation_codes_on_redeemed_by_id"
  end

  create_table "cancellations", force: :cascade do |t|
    t.bigint "account_id", null: false
    t.integer "nps_score", null: false
    t.string "reason"
    t.text "comment"
    t.datetime "reverted_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["account_id"], name: "index_cancellations_on_account_id"
  end

  create_table "child_profiles", force: :cascade do |t|
    t.bigint "account_id", null: false
    t.string "name", null: false
    t.string "avatar", default: "raposa", null: false
    t.string "age_band", default: "3-5", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "focus_valores", default: [], null: false, array: true
    t.string "focus_caminhos", default: [], null: false, array: true
    t.index ["account_id"], name: "index_child_profiles_on_account_id"
  end

  create_table "downloads", force: :cascade do |t|
    t.bigint "account_id", null: false
    t.bigint "title_id", null: false
    t.datetime "first_downloaded_at", null: false
    t.datetime "last_downloaded_at", null: false
    t.integer "count", default: 1, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["account_id", "title_id"], name: "index_downloads_on_account_id_and_title_id", unique: true
    t.index ["account_id"], name: "index_downloads_on_account_id"
    t.index ["title_id"], name: "index_downloads_on_title_id"
  end

  create_table "login_codes", force: :cascade do |t|
    t.citext "email", null: false
    t.string "code_digest", null: false
    t.datetime "expires_at", null: false
    t.integer "attempts", default: 0, null: false
    t.datetime "consumed_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "purpose", default: "password_reset", null: false
    t.index ["email", "created_at"], name: "index_login_codes_on_email_and_created_at"
  end

  create_table "profile_signals", force: :cascade do |t|
    t.bigint "child_profile_id", null: false
    t.string "kind", null: false
    t.string "key", null: false
    t.integer "count", default: 0, null: false
    t.datetime "last_at", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["child_profile_id", "kind", "key"], name: "index_profile_signals_on_child_profile_id_and_kind_and_key", unique: true
    t.index ["child_profile_id"], name: "index_profile_signals_on_child_profile_id"
  end

  create_table "reading_entries", force: :cascade do |t|
    t.bigint "child_profile_id", null: false
    t.bigint "title_id", null: false
    t.string "status", null: false
    t.boolean "liked"
    t.datetime "started_at"
    t.datetime "finished_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.integer "page", default: 0, null: false
    t.integer "pages_total"
    t.integer "quiz_score"
    t.integer "quiz_total"
    t.text "diary"
    t.index ["child_profile_id", "title_id"], name: "index_reading_entries_on_child_profile_id_and_title_id", unique: true
    t.index ["child_profile_id"], name: "index_reading_entries_on_child_profile_id"
    t.index ["title_id"], name: "index_reading_entries_on_title_id"
  end

  create_table "sessions", force: :cascade do |t|
    t.bigint "account_id", null: false
    t.string "token_digest", null: false
    t.string "user_agent"
    t.string "ip"
    t.datetime "expires_at", null: false
    t.datetime "last_used_at"
    t.datetime "revoked_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["account_id"], name: "index_sessions_on_account_id"
    t.index ["token_digest"], name: "index_sessions_on_token_digest", unique: true
  end

  create_table "subscriptions", force: :cascade do |t|
    t.bigint "account_id", null: false
    t.string "plan", default: "mensal", null: false
    t.string "status", default: "active", null: false
    t.string "source", default: "admin", null: false
    t.datetime "current_period_end", null: false
    t.datetime "canceled_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["account_id"], name: "index_subscriptions_on_account_id", unique: true
  end

  create_table "titles", force: :cascade do |t|
    t.string "slug", null: false
    t.string "title", null: false
    t.string "pdf_path"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["slug"], name: "index_titles_on_slug", unique: true
  end

  add_foreign_key "activation_codes", "accounts", column: "redeemed_by_id"
  add_foreign_key "cancellations", "accounts"
  add_foreign_key "child_profiles", "accounts"
  add_foreign_key "downloads", "accounts"
  add_foreign_key "downloads", "titles"
  add_foreign_key "profile_signals", "child_profiles"
  add_foreign_key "reading_entries", "child_profiles"
  add_foreign_key "reading_entries", "titles"
  add_foreign_key "sessions", "accounts"
  add_foreign_key "subscriptions", "accounts"
end
