require "test_helper"

class TeamTest < ActionDispatch::IntegrationTest
  test "admin marca outra conta como admin, mas não tira o próprio acesso" do
    bot = login("assistente@exemplo.com"); b = @token
    admin = login("admin@exemplo.com"); admin.update!(admin: true)

    get "/admin/admins", headers: { "Authorization" => "Bearer #{b}" }
    assert_response :forbidden

    post "/admin/admins", params: { email: "ASSISTENTE@exemplo.com " }, headers: auth
    assert_response :created
    assert bot.reload.admin?

    get "/admin/admins", headers: auth
    assert_equal %w[admin@exemplo.com assistente@exemplo.com], response.parsed_body.map { |a| a["email"] }

    delete "/admin/admins/#{admin.id}", headers: auth
    assert_response :unprocessable_entity
    delete "/admin/admins/#{bot.id}", headers: auth
    assert_response :no_content
    assert_not bot.reload.admin?

    post "/admin/admins", params: { email: "ninguem@exemplo.com" }, headers: auth
    assert_response :not_found
  end
end
