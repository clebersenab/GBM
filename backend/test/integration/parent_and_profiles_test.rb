require "test_helper"

class ParentAndProfilesTest < ActionDispatch::IntegrationTest
  test "criar perfil exige o PIN dos pais" do
    login
    post "/profiles", params: { profile: { name: "Giovana", avatar: "raposa", age_band: "6-8" } }, headers: auth
    assert_response :forbidden
    assert_equal "pin_not_set", response.parsed_body["code"]

    set_pin
    post "/profiles", params: { profile: { name: "Giovana", avatar: "raposa", age_band: "6-8" } }, headers: auth
    assert_response :created
  end

  test "a janela do PIN dura 10 minutos" do
    login
    set_pin
    travel 11.minutes
    post "/profiles", params: { profile: { name: "Bento" } }, headers: auth
    assert_response :forbidden
    assert_equal "pin_required", response.parsed_body["code"]
    post "/parent/unlock", params: { pin: "9999" }, headers: auth
    assert_response :forbidden
    post "/parent/unlock", params: { pin: "1234" }, headers: auth
    assert_response :ok
    post "/profiles", params: { profile: { name: "Bento" } }, headers: auth
    assert_response :created
  end

  test "criar o primeiro PIN só logo depois do login" do
    login
    travel 11.minutes
    post "/parent/pin", params: { pin: "1234" }, headers: auth
    assert_response :forbidden
  end

  test "trocar o PIN exige o PIN atual" do
    login
    set_pin("1234")
    post "/parent/pin", params: { pin: "5678", current_pin: "0000" }, headers: auth
    assert_response :forbidden
    post "/parent/pin", params: { pin: "5678", current_pin: "1234" }, headers: auth
    assert_response :no_content
  end

  test "PIN precisa ter 4 dígitos" do
    login
    post "/parent/pin", params: { pin: "12" }, headers: auth
    assert_response :unprocessable_entity
  end

  test "listar perfis não exige PIN; família não vê perfis de outra" do
    other = login("outra@exemplo.com")
    other.child_profiles.create!(name: "Pedro")
    login("pai@exemplo.com")
    get "/profiles", headers: auth
    assert_response :ok
    assert_equal [], response.parsed_body
    set_pin
    delete "/profiles/#{other.child_profiles.first.id}", headers: auth
    assert_response :not_found
  end

  test "limite de 6 perfis" do
    account = login
    set_pin
    6.times { |i| account.child_profiles.create!(name: "Filho #{i}") }
    post "/profiles", params: { profile: { name: "Sétimo" } }, headers: auth
    assert_response :unprocessable_entity
  end
end
