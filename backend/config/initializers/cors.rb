# A landing e a plataforma ficam na Vercel; a API, no Render.
# CORS_ORIGINS: lista separada por vírgula. As prévias da Vercel (gbm-*.vercel.app) também são aceitas.
Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    listed = ENV.fetch("CORS_ORIGINS", "http://localhost:5173,http://localhost:8765").split(",").map(&:strip)
    origins(*listed, %r{\Ahttps://gbm-[a-z0-9-]+\.vercel\.app\z})
    resource "*", headers: :any, methods: %i[get post put patch delete options head]
  end
end
