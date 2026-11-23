class CatalogController < ApplicationController
  allow_anonymous

  # GET /catalog -> mesmo formato do antigo data/catalogo.json
  def show
    render json: Catalog.build(request.base_url)
  end
end
