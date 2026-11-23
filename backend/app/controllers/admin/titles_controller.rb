# Cadastro de histórias.
#   admin: cria, edita tudo, envia para o editor, publica, devolve e despublica
#   editor: vê só as histórias atribuídas a ele e, enquanto estão em edição,
#           completa quiz, vocabulário e páginas e envia para revisão
module Admin
  class TitlesController < ApplicationController
    before_action :require_staff
    before_action :load_title, except: %i[index create]

    META = %i[title sinopse box volume vitrine lancamento cover_image_id].freeze
    LISTS = %i[valores caminhos fileiras colecoes].freeze

    # GET /admin/titles?status=
    def index
      scope = admin? ? Title.all : Title.where(editor: current_account)
      scope = scope.where(status: params[:status]) if params[:status].present?
      rows = scope.includes(:editor, :cover_image).order(updated_at: :desc)
      counts = (admin? ? Title.all : Title.where(editor: current_account)).group(:status).count
      render json: {
        counts: counts,
        items: rows.map do |t|
          { db_id: t.id, slug: t.slug, titulo: t.title, status: t.status, capa: t.capa_url(request.base_url),
            editor: t.editor&.email, pages: t.pages.size, updated_at: t.updated_at, review_note: t.review_note }
        end
      }
    end

    # GET /admin/titles/:id
    def show = render(json: @title.admin_view(request.base_url))

    # POST /admin/titles (só admin) -> nasce como rascunho
    def create
      return forbid unless admin?
      t = Title.new(status: "rascunho")
      assign_meta(t)
      t.slug = params[:slug].presence || t.title.to_s.parameterize
      t.pdf_path = "#{t.slug}.pdf"
      t.save!
      render json: t.admin_view(request.base_url), status: :created
    end

    # PATCH /admin/titles/:id
    def update
      Title.transaction do
        if admin?
          assign_meta(@title)
        elsif !(@title.status == "em_edicao" && @title.editor_id == current_account.id)
          return forbid("esta história não está com você para edição")
        end
        @title.quiz = clean_quiz if params.key?(:quiz)
        @title.vocabulario = clean_vocab if params.key?(:vocabulario)
        @title.save!
        replace_pages if params.key?(:pages)
      end
      render json: @title.reload.admin_view(request.base_url)
    end

    # POST /admin/titles/:id/transition { to, note? }
    def transition
      to = params.require(:to)
      from = @title.status
      allowed = admin? ? admin_moves(from) : editor_moves(from)
      return forbid("não dá para ir de #{from} para #{to}") unless allowed.include?(to)

      missing = case to
                when "em_edicao" then @title.editor_id ? [] : ["editor responsável"]
                when "em_revisao" then @title.missing_for_review
                when "publicado" then @title.missing_for_publish
                else []
                end
      return render(json: { error: "Falta: #{missing.to_sentence(words_connector: ", ", two_words_connector: " e ", last_word_connector: " e ")}", missing: missing }, status: :unprocessable_entity) if missing.any?

      attrs = { status: to }
      attrs[:review_note] = params[:note].presence if to == "em_edicao" && from == "em_revisao"
      attrs[:review_note] = nil if to.in?(%w[em_revisao publicado])
      attrs[:published_at] = Time.current if to == "publicado"
      @title.update!(attrs)
      render json: @title.admin_view(request.base_url)
    end

    # GET /admin/titles/:id/preview -> conteúdo do leitor, mesmo sem publicar
    def preview = render(json: @title.reader_view(request.base_url, amostra: true))

    # DELETE /admin/titles/:id (só admin, e só o que nunca foi publicado nem lido)
    def destroy
      return forbid unless admin?
      return forbid("histórias publicadas não podem ser apagadas; despublique antes") if @title.published?
      return forbid("já há leituras ou downloads desta história") if @title.reading_entries.exists? || @title.downloads.exists?
      @title.destroy!
      head :no_content
    end

    private

    def admin? = current_account.admin?
    def forbid(msg = "acesso restrito") = render(json: { error: msg }, status: :forbidden)

    def load_title
      @title = Title.find(params[:id])
      forbid unless admin? || @title.editor_id == current_account.id
    end

    def admin_moves(from)
      { "rascunho" => %w[em_edicao publicado], "em_edicao" => %w[rascunho em_revisao publicado],
        "em_revisao" => %w[em_edicao publicado], "publicado" => %w[rascunho] }.fetch(from, [])
    end

    def editor_moves(from) = from == "em_edicao" && @title.editor_id == current_account.id ? %w[em_revisao] : []

    def assign_meta(t)
      META.each { |k| t[k] = params[k] if params.key?(k) }
      t.title = t.title.to_s.strip
      t.box = t.box.presence
      t.volume = t.box ? params[:volume].presence&.to_i : nil if params.key?(:volume) || params.key?(:box)
      LISTS.each { |k| t[k] = Array(params[k]).map(&:to_s).map(&:strip).reject(&:blank?).uniq if params.key?(k) }
      if params.key?(:obra_mae)
        o = params[:obra_mae].respond_to?(:permit) ? params[:obra_mae].permit(:titulo, :autor, :tipo, :idade).to_h : {}
        t.obra_mae = o.transform_values { |v| v.to_s.strip }.reject { |_, v| v.blank? }
      end
      if params.key?(:editor_id)
        ed = params[:editor_id].presence && Account.find_by(id: params[:editor_id], editor: true)
        t.editor = ed
      end
    end

    def clean_quiz
      Array(params[:quiz]).map do |q|
        q = q.permit(:pergunta, :certa, :explica, opcoes: []).to_h
        { "pergunta" => q["pergunta"].to_s.strip, "opcoes" => Array(q["opcoes"]).map { |o| o.to_s.strip },
          "certa" => q["certa"].to_s.match?(/\A\d+\z/) ? q["certa"].to_i : nil, "explica" => q["explica"].to_s.strip.presence }.compact
      end
    end

    def clean_vocab
      Array(params[:vocabulario]).map { |v| v.permit(:palavra, :significado).to_h.transform_values { |x| x.to_s.strip } }
    end

    def replace_pages
      @title.pages.delete_all
      Array(params[:pages]).each_with_index do |p, i|
        p = p.permit(:image_id, :image_path, :text, :parent_question)
        img = p[:image_id].presence && StoredImage.find(p[:image_id])
        @title.pages.create!(position: i + 1, image: img, image_path: img ? nil : p[:image_path].presence,
                             text: p[:text].to_s.strip, parent_question: p[:parent_question].to_s.strip.presence)
      end
    end
  end
end
