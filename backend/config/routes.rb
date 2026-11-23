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
  patch "me", to: "me#update"
  patch "me/password", to: "me#password"
  get "me/subscription", to: "subscription#show"
  post "me/subscription/cancel", to: "subscription#cancel"
  post "me/subscription/resume", to: "subscription#resume"


  resources :profiles, only: %i[index create update destroy] do
    get "library", to: "library#index"
    put "library/:slug", to: "library#upsert"
    delete "library/:slug", to: "library#destroy"
    get "signals", to: "library#signals"
    post "signals", to: "library#signal"
  end

  get "catalog", to: "catalog#show"
  get "images/:id", to: "images#show", as: :stored_image
  get "titles/top", to: "top#index"
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
    resources :titles, only: %i[index show create update destroy] do
      member do
        post :transition
        get :preview
      end
    end
    resources :images, only: :create
    resources :editors, only: %i[index create destroy]
  end
end
