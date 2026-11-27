require "test_helper"

# Compartilhamento de conta: leituras ao mesmo tempo, aparelhos conectados e PDF carimbado.
class SharingTest < ActionDispatch::IntegrationTest
  def entrar(ua)
    post "/auth/login", params: { email: "pai@exemplo.com", password: "senha-segura" }, headers: { "User-Agent" => ua }
    assert_response :success
    { "Authorization" => "Bearer #{response.parsed_body["token"]}" }
  end

  test "no máximo 2 leituras ao mesmo tempo; o terceiro pode assumir uma vaga" do
    login
    a = entrar("Mozilla/5.0 (iPad; CPU OS 15_6) Safari/604.1")
    b = entrar("Mozilla/5.0 (Linux; Android 13) Chrome/120 Mobile Safari/537.36")
    c = entrar("Mozilla/5.0 (Windows NT 10.0) Chrome/120 Safari/537.36")

    post "/reading", params: { slug: "moby-dick" }, headers: a
    assert_response :success
    post "/reading", params: { slug: "hamlet" }, headers: b
    assert_response :success
    post "/reading", params: { slug: "hamlet" }, headers: a # renovar não conta como nova leitura
    assert_response :success

    post "/reading", params: { slug: "alice" }, headers: c
    assert_response :conflict
    body = response.parsed_body
    assert_equal "lotado", body["code"]
    assert_equal ["Android · Chrome", "iPad · Safari"], body["outros"].map { |o| o["aparelho"] }.sort

    ipad = body["outros"].find { |o| o["aparelho"] == "iPad · Safari" }
    post "/reading/takeover", params: { session_id: ipad["id"], slug: "alice" }, headers: c
    assert_response :success

    post "/reading", params: { slug: "hamlet" }, headers: a # o iPad perdeu a vaga
    assert_response :conflict
    assert_equal "assumida", response.parsed_body["code"]

    delete "/reading", headers: b # o Android fechou o livro
    post "/reading", params: { slug: "hamlet" }, headers: a
    assert_response :success
  end

  test "a vaga se libera sozinha quando o leitor para de avisar" do
    login
    a = entrar("iPad Safari"); b = entrar("Android Chrome"); c = entrar("Windows Chrome")
    post "/reading", params: { slug: "x" }, headers: a
    post "/reading", params: { slug: "x" }, headers: b
    travel 3.minutes do
      post "/reading", params: { slug: "x" }, headers: c
      assert_response :success
    end
  end

  test "até 6 aparelhos conectados; o sétimo derruba o de uso mais antigo" do
    login # 1º aparelho (cadastro)
    primeiro = @token
    travel 1.minute
    6.times { |i| travel(1.minute) { entrar("Aparelho #{i}") } }
    get "/me", headers: { "Authorization" => "Bearer #{primeiro}" }
    assert_response :unauthorized

    h = entrar("Mozilla/5.0 (iPhone) Safari")
    get "/auth/sessions", headers: h
    lista = response.parsed_body["aparelhos"]
    assert_equal 6, lista.size
    assert_equal 1, lista.count { |x| x["atual"] }

    outro = lista.find { |x| !x["atual"] }
    delete "/auth/sessions/#{outro["id"]}", headers: h
    assert_response :no_content
    get "/auth/sessions", headers: h
    assert_equal 5, response.parsed_body["aparelhos"].size
  ensure
    travel_back
  end

  test "o PDF sai carimbado com o nome e o e-mail de quem baixou" do
    account = login
    original = Prawn::Document.new { |d| d.text "Era uma vez"; d.start_new_page; d.text "Fim" }.render
    saida = PdfStamp.call(original, PdfStamp.label_for(account))
    pdf = CombinePDF.parse(saida)
    assert_equal 2, pdf.pages.size
    # o Prawn grava o texto em hexadecimal: "Cópia e" e "pai@e" aparecem no conteúdo das páginas
    assert_includes saida.b, "43f37069612065"
    assert_includes saida.b, "7061694065"
    assert_equal "Cópia exclusiva de Responsável · pai@exemplo.com · Para uso da família", PdfStamp.label_for(account)
  end
end
