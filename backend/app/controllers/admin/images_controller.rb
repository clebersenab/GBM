module Admin
  class ImagesController < ApplicationController
    before_action :require_staff

    # POST /admin/images (multipart: file) -> { id, url }
    def create
      file = params.require(:file)
      img = StoredImage.from_upload(file, current_account)
      render json: { id: img.id, url: img.url(request.base_url) }, status: :created
    end
  end
end
