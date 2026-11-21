class TitlesController < ApplicationController
  before_action :load_title

  # GET /titles/:slug/access
  def access = render(json: AccessPolicy.new(current_account, @title).to_h)

  # GET /titles/:slug/read -> conteúdo do leitor (só com assinatura ativa)
  def read
    policy = AccessPolicy.new(current_account, @title)
    return render(json: { error: "assinatura inativa" }, status: :forbidden) unless policy.can_read?
    render json: { slug: @title.slug, title: @title.title, pages_url: nil } # leitor entra numa próxima etapa
  end

  # POST /titles/:slug/download -> link temporário do PDF
  def download
    policy = AccessPolicy.new(current_account, @title)
    return render(json: { error: "assinatura inativa e livro não baixado antes" }, status: :forbidden) unless policy.can_download?
    Download.record!(current_account, @title)
    expires = FilesController::LINK_TTL.from_now
    token = FilesController.verifier.generate({ "a" => current_account.id, "t" => @title.id }, expires_at: expires)
    render json: { url: file_url(token), expires_at: expires }
  end

  private

  def load_title = @title = Title.find_by!(slug: params[:slug])
end
