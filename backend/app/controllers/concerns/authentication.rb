# Autenticação por token Bearer (uma sessão por aparelho).
module Authentication
  extend ActiveSupport::Concern

  included do
    before_action :require_login
  end

  class_methods do
    def allow_anonymous(**opts) = skip_before_action(:require_login, **opts)
  end

  private

  def current_session = @current_session
  def current_account = @current_session&.account

  def require_login
    token = request.authorization.to_s[/\ABearer (.+)\z/, 1]
    @current_session = Session.find_by_token(token)
    return render(json: { error: "faça login" }, status: :unauthorized) unless @current_session
    @current_session.touch_usage!
  end

  def require_admin
    render json: { error: "acesso restrito" }, status: :forbidden unless current_account.admin?
  end
end
