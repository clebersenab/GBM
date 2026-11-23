require "test_helper"

class TitleAccessTest < ActionDispatch::IntegrationTest
  test "sem assinatura: não lê nem baixa" do
    login
    get "/titles/#{title.slug}/read", headers: auth
    assert_response :forbidden
    post "/titles/#{title.slug}/download", headers: auth
    assert_response :forbidden
  end

  test "com assinatura: o livro com conteúdo chega com as páginas" do
    account = login
    activate!(account)
    t = title("moby-dick")
    2.times { |i| t.pages.create!(position: i + 1, image_path: "images/x#{i}.svg", text: "Página #{i + 1}") }
    get "/titles/moby-dick/read", headers: auth
    assert_response :ok
    assert_equal ["Página 1", "Página 2"], response.parsed_body["paginas"].map { |p| p["texto"] }
  end

  test "com assinatura ativa: lê, baixa e o livro passa a ser da família" do
    account = login
    activate!(account)
    get "/titles/#{title.slug}/read", headers: auth
    assert_response :ok
    post "/titles/#{title.slug}/download", headers: auth
    assert_response :ok
    assert response.parsed_body["url"].present?
    assert account.owns?(title)
  end

  test "depois de cancelar: só baixa de novo o que já tinha baixado, e não lê no app" do
    account = login
    activate!(account)
    post "/titles/#{title('hamlet').slug}/download", headers: auth
    account.subscription.cancel!

    get "/titles/hamlet/read", headers: auth
    assert_response :forbidden, "o app de leitura fecha com a assinatura cancelada"

    post "/titles/hamlet/download", headers: auth
    assert_response :ok, "o PDF já baixado continua sendo da família"

    post "/titles/#{title('otelo').slug}/download", headers: auth
    assert_response :forbidden, "livro novo não pode ser baixado"

    get "/downloads", headers: auth
    assert_equal ["hamlet"], response.parsed_body.map { |d| d["slug"] }
  end

  test "assinatura com período vencido conta como inativa" do
    account = login
    activate!(account, until_at: 1.day.ago)
    get "/titles/#{title.slug}/access", headers: auth
    assert_equal false, response.parsed_body["can_read"]
  end

  test "link do PDF expira e não pode ser adulterado" do
    account = login
    activate!(account)
    post "/titles/#{title.slug}/download", headers: auth
    path = URI(response.parsed_body["url"]).path
    get path
    assert_response :not_found # link válido; o arquivo ainda não foi publicado
    get path + "x"
    assert_response :gone
    travel 6.minutes
    get path
    assert_response :gone
  end

  test "livro de amostra abre para qualquer conta logada; os outros seguem a assinatura" do
    login
    get "/titles/demo-leitor/read", headers: auth
    assert_response :ok
    assert response.parsed_body["paginas"].size >= 10
    get "/titles/#{title('moby-dick').slug}/read", headers: auth
    assert_response :forbidden, "livro com conteúdo continua exigindo assinatura"
    Title.create!(slug: "rascunho-x", title: "Rascunho")
    get "/titles/rascunho-x/read", headers: auth
    assert_response :not_found, "rascunho não aparece para as famílias"
    get "/titles/../secrets/read", headers: auth
    assert_response :not_found
  end
end
