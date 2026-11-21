Rails.application.routes.draw do
  get "up" => "rails/health#show", as: :rails_health_check

  post "auth/signup", to: "auth#signup"
  post "auth/login", to: "auth#login"
  post "auth/password/forgot", to: "auth#forgot_password"
  post "auth/password/reset", to: "auth#reset_password"
  delete "auth/session", to: "auth#destroy"
  delete "auth/sessions", to: "auth#destroy_all"

  get "me", to: "me#show"
  patch "me/preferences", to: "me#preferences"

  post "parent/pin", to: "parent#set_pin"
  post "parent/unlock", to: "parent#unlock"
  post "parent/lock", to: "parent#lock"

  resources :profiles, only: %i[index create update destroy]

  get "titles/:slug/access", to: "titles#access"
  get "titles/:slug/read", to: "titles#read"
  post "titles/:slug/download", to: "titles#download"
  get "downloads", to: "downloads#index"
  get "files/:token", to: "files#show", as: :file

  post "codes/redeem", to: "activation_codes#redeem"

  namespace :admin do
    put "accounts/:account_id/subscription", to: "subscriptions#update"
    put "accounts/:account_id/access", to: "access#update"
    post "activation_codes", to: "activation_codes#create"
  end
end
