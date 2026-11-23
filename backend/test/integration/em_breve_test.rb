require "test_helper"

class EmBreveTest < ActionDispatch::IntegrationTest
  test "em breve aparece no catálogo e no top, entra na lista, mas não abre no leitor" do
    account = login
    activate!(account)
    kid = account.child_profiles.create!(name: "Maria")
    Title.create!(slug: "pub", title: "Publicado", status: "publicado", sinopse: "x", capa_path: "images/a.webp")
    Title.create!(slug: "breve", title: "Em breve", status: "em_edicao", em_breve: true, sinopse: "x", capa_path: "images/b.webp")
    Title.create!(slug: "oculto", title: "Rascunho", status: "rascunho")

    get "/catalog"
    titulos = response.parsed_body["titulos"].to_h { |t| [t["id"], t["em_breve"]] }
    assert_equal({ "pub" => false, "breve" => true }, titulos)

    get "/titles/top", headers: auth
    assert_equal %w[pub breve], response.parsed_body["items"].map { |i| i["slug"] }

    get "/titles/breve/read", headers: auth
    assert_response :not_found

    put "/profiles/#{kid.id}/library/breve", params: { status: "quero_ler" }, headers: auth
    assert_response :ok
    put "/profiles/#{kid.id}/library/oculto", headers: auth
    assert_response :not_found
  end

  test "livro publicado com ilustrações manda três páginas para o banner" do
    t = Title.create!(slug: "ilustrado", title: "Ilustrado", status: "publicado", sinopse: "x", capa_path: "images/a.webp")
    img = StoredImage.create!(content_type: "image/webp", data: "x", byte_size: 1)
    6.times { |i| t.pages.create!(position: i + 1, image: img, text: "Texto #{i + 1}") }
    get "/catalog"
    f = response.parsed_body["titulos"].find { |x| x["id"] == "ilustrado" }["folhear"]
    assert_equal ["Texto 1", "Texto 3", "Texto 5"], f.map { |x| x["texto"] }
    assert_match %r{/images/#{img.id}\z}, f.first["imagem"]
  end
end
