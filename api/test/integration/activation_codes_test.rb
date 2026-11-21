require "test_helper"

class ActivationCodesTest < ActionDispatch::IntegrationTest
  test "código da loja ativa 12 meses e não pode ser usado de novo" do
    account = login
    set_pin
    code = ActivationCode.create!(months: 12, store: "Loja Teste")
    post "/codes/redeem", params: { code: code.code.downcase.delete("-") }, headers: auth
    assert_response :ok
    assert_equal "anual", response.parsed_body["plan"]
    assert account.reload.subscription_active?
    assert_in_delta 12.months.from_now, account.subscription.current_period_end, 1.minute

    login("outro@exemplo.com")
    set_pin
    post "/codes/redeem", params: { code: code.code }, headers: auth
    assert_response :unprocessable_entity
  end

  test "código soma ao período que ainda está pago" do
    account = login
    set_pin
    activate!(account, until_at: 10.days.from_now)
    code = ActivationCode.create!(months: 12)
    post "/codes/redeem", params: { code: code.code }, headers: auth
    assert_in_delta 10.days.from_now + 12.months, account.reload.subscription.current_period_end, 1.minute
  end

  test "resgatar exige o PIN e o código não pode estar expirado" do
    login
    code = ActivationCode.create!(months: 3, expires_at: 1.day.ago)
    post "/codes/redeem", params: { code: code.code }, headers: auth
    assert_response :forbidden
    set_pin
    post "/codes/redeem", params: { code: code.code }, headers: auth
    assert_response :unprocessable_entity
  end
end
