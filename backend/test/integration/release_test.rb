require "test_helper"

class ReleaseTest < ActionDispatch::IntegrationTest
  test "admin libera uma conta por um período, sem pagamento" do
    family = login("familia@exemplo.com")
    post "/auth/signup", params: { email: "admin@exemplo.com", password: "senha-admin", accept_terms: true }
    admin_token = response.parsed_body["token"]
    Account.find_by!(email: "admin@exemplo.com").update!(admin: true)
    admin = { "Authorization" => "Bearer #{admin_token}" }

    put "/admin/accounts/#{family.id}/access", params: { status: "liberado", until: 1.month.from_now }, headers: auth
    assert_response :forbidden, "família não libera a si mesma"

    put "/admin/accounts/#{family.id}/access", params: { status: "liberado", until: 1.month.from_now }, headers: admin
    assert_response :ok
    assert_equal "liberado", response.parsed_body["reason"]

    get "/titles/#{title.slug}/read", headers: auth
    assert_response :ok

    travel 32.days
    get "/titles/#{title.slug}/read", headers: auth
    assert_response :forbidden, "liberação vencida fecha o acesso"
  end

  test "liberação exige período válido" do
    family = login
    family.access_status = "liberado"
    assert_not family.valid?
    family.assign_attributes(access_from: Time.current, access_until: 1.day.ago)
    assert_not family.valid?
  end

  test "bloqueado perde o acesso mesmo com assinatura ativa" do
    family = login
    activate!(family)
    family.update!(access_status: "bloqueado")
    get "/titles/#{title.slug}/read", headers: auth
    assert_response :forbidden
  end

  test "tarefa gbm:liberar cria a conta liberada com senha" do
    Rails.application.load_tasks unless Rake::Task.task_defined?("gbm:liberar")
    ENV.update("EMAIL" => "Teste+Liberado@Exemplo.com", "PASSWORD" => "Senha123!", "UNTIL" => "2050-12-31")
    assert_output(/liberado/) { Rake::Task["gbm:liberar"].execute }
    a = Account.find_by!(email: "teste+liberado@exemplo.com")
    assert a.full_access?
    assert a.authenticate_password("Senha123!")
    assert_equal Date.new(2050, 12, 31), a.access_until.to_date
  ensure
    %w[EMAIL PASSWORD UNTIL].each { |k| ENV.delete(k) }
  end
end
