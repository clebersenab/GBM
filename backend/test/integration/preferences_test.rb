require "test_helper"

class PreferencesTest < ActionDispatch::IntegrationTest
  test "tema começa escuro e a escolha fica salva na conta" do
    login("tema@exemplo.com")
    get "/me", headers: auth
    assert_equal "dark", response.parsed_body["theme"]

    patch "/me/preferences", params: { theme: "light" }, headers: auth
    assert_response :ok
    assert_equal "light", response.parsed_body["theme"]

    post "/auth/login", params: { email: "tema@exemplo.com", password: "senha-segura" }
    get "/me", headers: { "Authorization" => "Bearer #{response.parsed_body['token']}" }
    assert_equal "light", response.parsed_body["theme"]

    patch "/me/preferences", params: { theme: "roxo" }, headers: auth
    assert_response :unprocessable_entity
  end

  test "salvar tema exige login" do
    patch "/me/preferences", params: { theme: "light" }
    assert_response :unauthorized
  end
end
