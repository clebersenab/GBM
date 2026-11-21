require "test_helper"

class AuthTest < ActionDispatch::IntegrationTest
  test "login por código cria a conta no primeiro acesso" do
    assert_difference -> { Account.count }, 1 do
      login("nova@exemplo.com")
    end
    get "/me", headers: auth
    assert_response :ok
    assert_equal "nova@exemplo.com", response.parsed_body["email"]
  end

  test "pedir código não revela se o e-mail existe" do
    post "/auth/code", params: { email: "ninguem@exemplo.com" }
    assert_response :accepted
  end

  test "código errado é recusado e conta tentativa" do
    post "/auth/code", params: { email: "a@exemplo.com" }
    post "/auth/verify", params: { email: "a@exemplo.com", code: "000000" }
    assert_response :unauthorized
    assert_equal 1, LoginCode.last.attempts
  end

  test "código não pode ser usado duas vezes" do
    perform_enqueued_jobs { post "/auth/code", params: { email: "b@exemplo.com" } }
    code = ActionMailer::Base.deliveries.last.body.to_s[/\b(\d{6})\b/, 1]
    post "/auth/verify", params: { email: "b@exemplo.com", code: code }
    assert_response :created
    post "/auth/verify", params: { email: "b@exemplo.com", code: code }
    assert_response :unauthorized
  end

  test "código expira" do
    perform_enqueued_jobs { post "/auth/code", params: { email: "c@exemplo.com" } }
    code = ActionMailer::Base.deliveries.last.body.to_s[/\b(\d{6})\b/, 1]
    travel 11.minutes
    post "/auth/verify", params: { email: "c@exemplo.com", code: code }
    assert_response :unauthorized
  end

  test "depois de 5 tentativas erradas o código certo também é recusado" do
    perform_enqueued_jobs { post "/auth/code", params: { email: "d@exemplo.com" } }
    code = ActionMailer::Base.deliveries.last.body.to_s[/\b(\d{6})\b/, 1]
    5.times { post "/auth/verify", params: { email: "d@exemplo.com", code: "999999" } }
    post "/auth/verify", params: { email: "d@exemplo.com", code: code }
    assert_response :unauthorized
  end

  test "sem token não entra; sair revoga a sessão" do
    get "/me"
    assert_response :unauthorized
    login
    delete "/auth/session", headers: auth
    assert_response :no_content
    get "/me", headers: auth
    assert_response :unauthorized
  end

  test "sair de todos os aparelhos exige o PIN" do
    login
    set_pin
    post "/parent/lock", headers: auth
    delete "/auth/sessions", headers: auth
    assert_response :forbidden
    post "/parent/unlock", params: { pin: "1234" }, headers: auth
    delete "/auth/sessions", headers: auth
    assert_response :no_content
    get "/me", headers: auth
    assert_response :unauthorized
  end
end
