class AuthController < ApplicationController
  allow_anonymous only: %i[request_code verify]
  rate_limit to: 10, within: 10.minutes, only: :request_code, with: -> { render json: { error: "muitas tentativas" }, status: :too_many_requests }
  rate_limit to: 20, within: 10.minutes, only: :verify, with: -> { render json: { error: "muitas tentativas" }, status: :too_many_requests }

  # POST /auth/code { email }
  # Sempre responde 202 para não revelar quais e-mails têm conta.
  def request_code
    email = params.require(:email).to_s.strip.downcase
    return render(json: { error: "e-mail inválido" }, status: :unprocessable_entity) unless email.match?(URI::MailTo::EMAIL_REGEXP)
    issued = LoginCode.issue!(email)
    LoginCodeMailer.with(email: email, code: issued.last).code.deliver_later if issued
    head :accepted
  end

  # POST /auth/verify { email, code } -> { token, account }
  # Cria a conta no primeiro acesso.
  def verify
    email = params.require(:email).to_s.strip.downcase
    unless LoginCode.verify(email, params.require(:code))
      return render(json: { error: "código inválido ou expirado" }, status: :unauthorized)
    end
    account = Account.find_or_create_by!(email: email)
    session = Session.start!(account, user_agent: request.user_agent, ip: request.remote_ip)
    render json: { token: session.token, account: MeController.payload(account, session) }, status: :created
  end

  # DELETE /auth/session  -> sai deste aparelho
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
end
