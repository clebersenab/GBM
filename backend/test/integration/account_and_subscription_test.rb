require "test_helper"

class AccountAndSubscriptionTest < ActionDispatch::IntegrationTest
  test "editar dados do cadastro e trocar a senha" do
    login("conta@exemplo.com")
    patch "/me", params: { name: "Cleber", phone: "85 90000-0000", marketing_opt_in: true, email: "outro@x.com" }, headers: auth
    body = response.parsed_body
    assert_equal ["Cleber", "85 90000-0000", true, "conta@exemplo.com"], body.values_at("name", "phone", "marketing_opt_in", "email")
    patch "/me/password", params: { current_password: "errada", password: "nova-senha-1" }, headers: auth
    assert_response :forbidden
    patch "/me/password", params: { current_password: "senha-segura", password: "nova-senha-1" }, headers: auth
    assert_response :no_content
    post "/auth/login", params: { email: "conta@exemplo.com", password: "nova-senha-1" }
    assert_response :ok
  end

  test "cancelar pede NPS, mantém o acesso até o fim do período e pode ser desfeito" do
    account = login
    get "/me/subscription", headers: auth
    assert_equal "sem_acesso", response.parsed_body["kind"]
    post "/me/subscription/cancel", params: { nps_score: 5 }, headers: auth
    assert_response :unprocessable_entity

    activate!(account, until_at: 20.days.from_now)
    account.subscription.update!(source: "gateway")
    get "/me/subscription", headers: auth
    assert response.parsed_body["next_charge_at"].present?
    post "/me/subscription/cancel", params: { nps_score: 11 }, headers: auth
    assert_response :unprocessable_entity
    post "/me/subscription/cancel", params: { nps_score: 7, reason: "preco", comment: "caro" }, headers: auth
    assert_response :ok
    body = response.parsed_body
    assert_nil body["next_charge_at"]
    assert body["renewal_canceled_at"].present?
    assert account.reload.full_access?
    assert_equal 7, account.cancellations.last.nps_score

    post "/me/subscription/resume", headers: auth
    assert_nil response.parsed_body["renewal_canceled_at"]
    assert account.cancellations.last.reverted_at.present?
  end
end
