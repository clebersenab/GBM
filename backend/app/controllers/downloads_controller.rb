class DownloadsController < ApplicationController
  # GET /downloads -> livros da família (continuam valendo depois de cancelar)
  def index
    list = current_account.downloads.includes(:title).order(first_downloaded_at: :desc)
    render json: list.map { |d| { slug: d.title.slug, title: d.title.title, first_downloaded_at: d.first_downloaded_at } }
  end
end
