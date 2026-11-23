# O admin escolhe quem também é admin. A pessoa (ou o assistente) cria a conta antes.
module Admin
  class AdminsController < ApplicationController
    before_action :require_admin

    def index = render(json: Account.where(admin: true).order(:email).map { |a| view(a) })

    # POST /admin/admins { email }
    def create
      a = Account.find_by(email: params.require(:email).to_s.strip.downcase)
      return render(json: { error: "não há conta com esse e-mail; peça para a pessoa se cadastrar antes" }, status: :not_found) unless a
      a.update!(admin: true)
      render json: view(a), status: :created
    end

    # DELETE /admin/admins/:id -> ninguém tira o próprio acesso, e sempre sobra pelo menos um admin
    def destroy
      a = Account.find(params[:id])
      return render(json: { error: "você não pode tirar o seu próprio acesso de admin" }, status: :unprocessable_entity) if a == current_account
      a.update!(admin: false)
      head :no_content
    end

    private

    def view(a) = { id: a.id, email: a.email, name: a.name, voce: a == current_account }
  end
end
