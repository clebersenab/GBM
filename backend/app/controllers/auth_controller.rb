class AuthController < ApplicationController
  allow_anonymous only: %i[signup login forgot_password reset_password]
  too_many = -> { render json: { error: "muitas tentativas, aguarde alguns minutos" }, status: :too_many_requests }
  rate_limit to: 10, within: 10.minutes, only: :login, with: too_many
  rate_limit to: 5, within: 10.minutes, only: %i[signup forgot_password], with: too_many
  rate_limit to: 10, within: 10.minutes, only: :reset_password, with: too_many

  # POST /auth/signup { name, email, password, phone?, accept_terms, marketing_opt_in? }
  # A conta nasce sem acesso aos livros até haver pagamento ou liberação do admin.
  def signup
    unless ActiveModel::Type::Boolean.new.cast(params[:accept_terms])
      return render(json: { error: "é preciso aceitar os termos de uso e a política de privacidade" }, status: :unprocessable_entity)
    end
    if params[:password].blank?
      return render(json: { error: "senha deve ter pelo menos 8 caracteres" }, status: :unprocessable_entity)
    end
    account = Account.new(name: params[:name], email: params[:email], password: params[:password], phone: params[:phone],
                          terms_accepted_at: Time.current, marketing_opt_in: ActiveModel::Type::Boolean.new.cast(params[:marketing_opt_in]) || false)
    if Account.exists?(email: account.email)
      return render(json: { error: "este e-mail já tem cadastro; entre ou recupere a senha" }, status: :conflict)
    end
    account.save!
    start_session(account, :created)
  end

  # POST /auth/login { email, password }
  def login
    account = Account.find_by(email: params[:email].to_s.strip.downcase)
    unless account&.password_digest.present? && account.authenticate_password(params[:password].to_s)
      return render(json: { error: "e-mail ou senha incorretos" }, status: :unauthorized)
    end
    start_session(account, :ok)
  end

  # POST /auth/password/forgot { email } -> envia código; sempre 202 para não revelar cadastros
  def forgot_password
    email = params[:email].to_s.strip.downcase
    if Account.exists?(email: email) && (issued = LoginCode.issue!(email))
      PasswordMailer.with(email: email, code: issued.last).reset.deliver_later
    end
    head :accepted
  end

  # POST /auth/password/reset { email, code, password } -> troca a senha e encerra as outras sessões
  def reset_password
    email = params[:email].to_s.strip.downcase
    account = Account.find_by(email: email)
    unless account && LoginCode.verify(email, params[:code].to_s)
      return render(json: { error: "código inválido ou expirado" }, status: :unauthorized)
    end
    return render(json: { error: "senha deve ter pelo menos 8 caracteres" }, status: :unprocessable_entity) if params[:password].blank?
    account.update!(password: params[:password])
    account.sessions.live.find_each(&:revoke!)
    start_session(account, :ok)
  end

  # DELETE /auth/session -> sai deste aparelho
  def destroy
    current_session.revoke!
    head :no_content
  end

  # DELETE /auth/sessions -> sai de todos os aparelhos (exige PIN)
  def destroy_all
    require_parent
    return if performed?
    current_account.sessions.live.find_each(&:revoke!)
    head :no_content
  end

  private

  def start_session(account, status)
    session = Session.start!(account, user_agent: request.user_agent, ip: request.remote_ip)
    render json: { token: session.token, account: MeController.payload(account, session) }, status: status
  end
end
