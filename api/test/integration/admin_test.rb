require "test_helper"

class AdminTest < ActionDispatch::IntegrationTest
  test "só admin ativa assinatura e gera códigos" do
    family = login("familia@exemplo.com")
    put "/admin/accounts/#{family.id}/subscription", params: { status: "active", current_period_end: 1.month.from_now }, headers: auth
    assert_response :forbidden

    admin = login("admin@exemplo.com")
    admin.update!(admin: true)
    put "/admin/accounts/#{family.id}/subscription", params: { plan: "mensal", status: "active", current_period_end: 1.month.from_now }, headers: auth
    assert_response :ok
    assert family.reload.subscription_active?

    put "/admin/accounts/#{family.id}/subscription", params: { status: "canceled" }, headers: auth
    assert_not family.reload.subscription_active?

    post "/admin/activation_codes", params: { months: 12, store: "Loja Teste", quantity: 3 }, headers: auth
    assert_response :created
    assert_equal 3, response.parsed_body.size
    assert_match(/\A[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}\z/, response.parsed_body.first["code"])
  end
end
