# O admin escolhe quem é editor. A pessoa precisa ter criado a conta antes.
module Admin
  class EditorsController < ApplicationController
    before_action :require_admin, except: :index
    before_action :require_staff, only: :index

    def index = render(json: Account.where(editor: true).order(:email).map { |a| view(a) })

    # POST /admin/editors { email }
    def create
      a = Account.find_by(email: params.require(:email).to_s.strip.downcase)
      return render(json: { error: "não há conta com esse e-mail; peça para a pessoa se cadastrar antes" }, status: :not_found) unless a
      a.update!(editor: true)
      render json: view(a), status: :created
    end

    # DELETE /admin/editors/:id -> histórias em edição com essa pessoa voltam para rascunho
    def destroy
      a = Account.find(params[:id])
      Account.transaction do
        a.update!(editor: false)
        Title.where(editor: a, status: %w[em_edicao em_revisao]).update_all(status: "rascunho", updated_at: Time.current)
      end
      head :no_content
    end

    private

    def view(a) = { id: a.id, email: a.email, name: a.name, titles: Title.where(editor: a).where.not(status: "publicado").count }
  end
end
