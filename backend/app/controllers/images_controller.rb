class ImagesController < ApplicationController
  allow_anonymous

  # GET /images/:id -> a imagem nunca muda (troca de imagem = novo id), então o cache é longo.
  def show
    img = StoredImage.find(params[:id])
    response.headers["Cache-Control"] = "public, max-age=31536000, immutable"
    response.headers["Cross-Origin-Resource-Policy"] = "cross-origin"
    send_data img.data, type: img.content_type, disposition: "inline"
  end
end
