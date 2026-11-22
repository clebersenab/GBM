require "test_helper"

class ParentAndProfilesTest < ActionDispatch::IntegrationTest
  test "criar, editar e apagar perfil sem PIN, com foco dos pais" do
    login
    post "/profiles", params: { profile: { name: "Bento", avatar: "leao", age_band: "6-8" } }, headers: auth
    assert_response :created
    id = response.parsed_body["id"]
    patch "/profiles/#{id}", params: { profile: { name: "Bentinho", focus_valores: %w[Coragem Fé], focus_caminhos: ["Medicina"] } }, headers: auth
    assert_response :ok
    assert_equal %w[Coragem Fé], response.parsed_body["focus_valores"]
    patch "/profiles/#{id}", params: { profile: { focus_valores: %w[A B C D E F] } }, headers: auth
    assert_response :unprocessable_entity
    delete "/profiles/#{id}", headers: auth
    assert_response :no_content
  end

  test "família não vê nem mexe em perfis de outra" do
    other = login("outra@exemplo.com")
    other.child_profiles.create!(name: "Pedro")
    login("pai@exemplo.com")
    get "/profiles", headers: auth
    assert_equal [], response.parsed_body
    delete "/profiles/#{other.child_profiles.first.id}", headers: auth
    assert_response :not_found
    get "/profiles/#{other.child_profiles.first.id}/library", headers: auth
    assert_response :not_found
  end

  test "limite de 6 perfis" do
    account = login
    6.times { |i| account.child_profiles.create!(name: "Filho #{i}") }
    post "/profiles", params: { profile: { name: "Sétimo" } }, headers: auth
    assert_response :unprocessable_entity
  end
end
