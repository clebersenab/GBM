require "test_helper"

class AuthTest < ActionDispatch::IntegrationTest
  test "cadastro cria a conta sem acesso aos livros" do
    login("nova@exemplo.com")
    get "/me", headers: auth
    assert_response :ok
    body = response.parsed_body
    assert_equal "nova@exemplo.com", body["email"]
    assert_equal false, body["access"]["full_access"]
    assert_equal "sem_acesso", body["access"]["reason"]
    assert Account.last.terms_accepted_at.present?
  end

  test "cadastro exige aceite dos termos, senha de 8 caracteres e e-mail único" do
    post "/auth/signup", params: { email: "x@exemplo.com", password: "senha-segura" }
    assert_response :unprocessable_entity
    post "/auth/signup", params: { email: "x@exemplo.com", password: "curta", accept_terms: true }
    assert_response :unprocessable_entity
    login("x@exemplo.com")
    post "/auth/signup", params: { email: "X@Exemplo.com", password: "outra-senha", accept_terms: true }
    assert_response :conflict
  end

  test "login com senha" do
    login("pai@exemplo.com", password: "Cbs123!xyz")
    post "/auth/login", params: { email: "PAI@exemplo.com", password: "errada" }
    assert_response :unauthorized
    post "/auth/login", params: { email: "PAI@exemplo.com", password: "Cbs123!xyz" }
    assert_response :ok
    assert response.parsed_body["token"].present?
  end

  test "esqueci a senha: código por e-mail troca a senha e derruba as outras sessões" do
    login("mae@exemplo.com", password: "senha-antiga")
    old_token = @token
    perform_enqueued_jobs { post "/auth/password/forgot", params: { email: "mae@exemplo.com" } }
    assert_response :accepted
    code = ActionMailer::Base.deliveries.last.body.to_s[/\b(\d{6})\b/, 1]
    post "/auth/password/reset", params: { email: "mae@exemplo.com", code: "000000", password: "senha-nova-123" }
    assert_response :unauthorized
    post "/auth/password/reset", params: { email: "mae@exemplo.com", code: code, password: "senha-nova-123" }
    assert_response :ok
    get "/me", headers: { "Authorization" => "Bearer #{old_token}" }
    assert_response :unauthorized
    post "/auth/login", params: { email: "mae@exemplo.com", password: "senha-nova-123" }
    assert_response :ok
  end

  test "esqueci a senha não revela se o e-mail existe e o código expira" do
    perform_enqueued_jobs { post "/auth/password/forgot", params: { email: "ninguem@exemplo.com" } }
    assert_response :accepted
    assert_empty ActionMailer::Base.deliveries

    login("e@exemplo.com")
    perform_enqueued_jobs { post "/auth/password/forgot", params: { email: "e@exemplo.com" } }
    code = ActionMailer::Base.deliveries.last.body.to_s[/\b(\d{6})\b/, 1]
    travel 31.minutes
    post "/auth/password/reset", params: { email: "e@exemplo.com", code: code, password: "senha-nova-123" }
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
