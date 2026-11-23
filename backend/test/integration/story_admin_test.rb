require "test_helper"

class StoryAdminTest < ActionDispatch::IntegrationTest
  def as(token) = { "Authorization" => "Bearer #{token}" }
  def png = Rack::Test::UploadedFile.new(StringIO.new("\x89PNG\r\n\x1a\nfake"), "image/png", original_filename: "p.png")

  test "fluxo: admin cria, editor completa, admin devolve e publica" do
    admin = login("admin@exemplo.com"); admin.update!(admin: true); a = @token
    ed = login("editor@exemplo.com"); e = @token
    login("outro@exemplo.com"); o = @token

    post "/admin/titles", params: { title: "Rascunho" }, headers: as(e)
    assert_response :forbidden, "editor não cria história"

    post "/admin/editors", params: { email: "editor@exemplo.com" }, headers: as(a)
    assert_response :created
    assert ed.reload.editor?

    post "/admin/images", params: { file: png }, headers: as(a)
    capa = response.parsed_body["id"]
    get "/images/#{capa}"
    assert_response :ok
    assert_equal "image/png", response.media_type

    post "/admin/titles", params: { title: "O Pequeno Navegante", sinopse: "Um menino e o mar.", cover_image_id: capa,
                                    obra_mae: { titulo: "Moby Dick", autor: "Herman Melville", tipo: "livro", idade: "14+" },
                                    valores: ["Coragem", ""], caminhos: ["Medicina"], editor_id: ed.id }, headers: as(a)
    assert_response :created
    t = response.parsed_body
    assert_equal ["o-pequeno-navegante", "rascunho", ["Coragem"]], t.values_at("id", "status", "valores")
    id = t["db_id"]

    get "/catalog"
    assert_not_includes response.parsed_body["titulos"].map { |x| x["id"] }, "o-pequeno-navegante", "rascunho fica fora do catálogo"

    get "/admin/titles", headers: as(e)
    patch "/admin/titles/#{id}", params: { quiz: [] }, headers: as(e)
    assert_response :forbidden, "em rascunho o editor ainda não edita"

    post "/admin/titles/#{id}/transition", params: { to: "em_edicao" }, headers: as(a)
    assert_equal "em_edicao", response.parsed_body["status"]

    get "/admin/titles", headers: as(o)
    assert_response :forbidden, "quem não é editor nem admin fica fora"
    get "/admin/titles", headers: as(e)
    assert_equal ["o-pequeno-navegante"], response.parsed_body["items"].map { |x| x["slug"] }

    post "/admin/titles/#{id}/transition", params: { to: "em_revisao" }, headers: as(e)
    assert_response :unprocessable_entity
    assert_includes response.parsed_body["missing"], "pelo menos uma página"

    patch "/admin/titles/#{id}", params: { title: "Outro nome" }, headers: as(e)
    assert_equal "O Pequeno Navegante", Title.find(id).title, "editor não muda os dados do admin"

    post "/admin/images", params: { file: png }, headers: as(e)
    img = response.parsed_body["id"]
    patch "/admin/titles/#{id}", params: {
      pages: [{ image_id: img, text: "Era uma vez.", parent_question: "O que é o mar?" }, { image_id: img, text: "Fim." }],
      quiz: [{ pergunta: "Quem navega?", opcoes: ["O menino", "O gato"], certa: "0", explica: "Foi o menino." }],
      vocabulario: [{ palavra: "Mar", significado: "Muita água salgada." }]
    }, headers: as(e), as: :json
    assert_response :ok
    body = response.parsed_body
    assert_equal [2, 0], [body["pages"].size, body["quiz"].first["certa"]]

    patch "/admin/titles/#{id}", params: { quiz: [{ pergunta: "?", opcoes: ["só uma"], certa: 0 }] }, headers: as(e), as: :json
    assert_response :unprocessable_entity

    post "/admin/titles/#{id}/transition", params: { to: "em_revisao" }, headers: as(e)
    assert_equal "em_revisao", response.parsed_body["status"]
    patch "/admin/titles/#{id}", params: { quiz: [] }, headers: as(e), as: :json
    assert_response :forbidden, "em revisão o editor não mexe mais"

    post "/admin/titles/#{id}/transition", params: { to: "em_edicao", note: "Página 2 está curta." }, headers: as(a)
    assert_equal ["em_edicao", "Página 2 está curta."], response.parsed_body.values_at("status", "review_note")

    post "/admin/titles/#{id}/transition", params: { to: "em_revisao" }, headers: as(e)
    post "/admin/titles/#{id}/transition", params: { to: "publicado" }, headers: as(e)
    assert_response :forbidden, "editor não publica"

    get "/admin/titles/#{id}/preview", headers: as(a)
    assert_equal ["Era uma vez.", true], [response.parsed_body["paginas"].first["texto"], response.parsed_body["amostra"]]

    post "/admin/titles/#{id}/transition", params: { to: "publicado" }, headers: as(a)
    assert_equal "publicado", response.parsed_body["status"]
    get "/catalog"
    novo = response.parsed_body["titulos"].find { |x| x["id"] == "o-pequeno-navegante" }
    assert_match %r{/images/#{capa}\z}, novo["capa"]

    delete "/admin/titles/#{id}", headers: as(a)
    assert_response :forbidden, "publicada não se apaga"
  end

  test "publicar exige sinopse e capa; box novo entra no catálogo na ordem do volume" do
    admin = login("admin@exemplo.com"); admin.update!(admin: true)
    post "/admin/titles", params: { title: "Sem capa" }, headers: auth
    id = response.parsed_body["db_id"]
    post "/admin/titles/#{id}/transition", params: { to: "publicado" }, headers: auth
    assert_response :unprocessable_entity
    assert_equal %w[sinopse capa], response.parsed_body["missing"]

    box = Catalog.static["grupos"].find { |g| g["tipo"] == "box" }["id"]
    %w[2 1].each do |v|
      Title.create!(slug: "vol-#{v}", title: "Vol #{v}", sinopse: "x", capa_path: "images/x.webp", status: "publicado", box: box, volume: v.to_i)
    end
    get "/catalog"
    g = response.parsed_body["grupos"].find { |x| x["id"] == box }
    assert_equal %w[vol-1 vol-2], g["titulos"]

    delete "/admin/titles/#{id}", headers: auth
    assert_response :no_content
  end
end
