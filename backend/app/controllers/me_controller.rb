class MeController < ApplicationController
  def self.payload(account, _session = nil)
    {
      email: account.email,
      name: account.name,
      phone: account.phone,
      marketing_opt_in: account.marketing_opt_in,
      admin: account.admin?,
      profiles: account.child_profiles.order(:created_at).map(&:view),
      access: account.access_summary,
      theme: account.theme || "dark"
    }
  end

  # GET /me
  def show = render(json: self.class.payload(current_account))

  # PATCH /me  { name, phone, marketing_opt_in } -> dados do cadastro
  def update
    current_account.update!(params.permit(:name, :phone, :marketing_opt_in))
    render json: self.class.payload(current_account)
  end

  # PATCH /me/password { current_password, password } -> derruba os outros aparelhos
  def password
    unless current_account.authenticate_password(params[:current_password].to_s)
      return render(json: { error: "Senha atual incorreta." }, status: :forbidden)
    end
    new_password = params[:password].to_s
    return render(json: { error: "A nova senha deve ter pelo menos 8 caracteres." }, status: :unprocessable_entity) if new_password.size < 8

    current_account.update!(password: new_password)
    current_account.sessions.live.where.not(id: current_session.id).find_each(&:revoke!)
    head :no_content
  end

  # PATCH /me/preferences  { theme: "dark" | "light" }
  def preferences
    theme = params[:theme].to_s
    return render(json: { error: "Tema inválido." }, status: :unprocessable_entity) unless Account::THEMES.include?(theme)

    current_account.update!(theme: theme)
    render json: self.class.payload(current_account)
  end
end
