class TitlesController < ApplicationController
  before_action :load_title, except: :read

  # GET /titles/:slug/access
  def access = render(json: AccessPolicy.new(current_account, @title).to_h)

  # GET /titles/:slug/read -> conteúdo do leitor (só com assinatura ativa)
  def read
    book = BookContent.find(params[:slug])
    return render(json: book) if book&.dig("amostra")

    load_title
    policy = AccessPolicy.new(current_account, @title)
    return render(json: { error: "assinaturas abrem em breve", code: "sem_acesso" }, status: :forbidden) unless policy.can_read? || book&.dig("livre")
    render json: book || { slug: @title.slug, titulo: @title.title, paginas: nil } # ainda em preparação
  end

  # POST /titles/:slug/download -> link temporário do PDF
  def download
    policy = AccessPolicy.new(current_account, @title)
    return render(json: { error: "assinaturas abrem em breve", code: "sem_acesso" }, status: :forbidden) unless policy.can_download?
    Download.record!(current_account, @title)
    expires = FilesController::LINK_TTL.from_now
    token = FilesController.verifier.generate({ "a" => current_account.id, "t" => @title.id }, expires_at: expires)
    render json: { url: file_url(token), expires_at: expires }
  end

  private

  def load_title = @title = Title.find_by!(slug: params[:slug])
end
