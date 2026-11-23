require "test_helper"

class LibraryTest < ActionDispatch::IntegrationTest
  test "estante por criança: quero ler, lendo, lido e gostei" do
    account = login
    kid = account.child_profiles.create!(name: "Giovana")
    title("moby-dick")
    put "/profiles/#{kid.id}/library/moby-dick", headers: auth
    assert_equal "quero_ler", response.parsed_body["status"]
    put "/profiles/#{kid.id}/library/moby-dick", params: { status: "lendo" }, headers: auth
    assert response.parsed_body["started_at"].present?
    put "/profiles/#{kid.id}/library/moby-dick", params: { status: "lido", liked: true }, headers: auth
    body = response.parsed_body
    assert_equal ["lido", true], [body["status"], body["liked"]]
    assert body["finished_at"].present?
    get "/profiles/#{kid.id}/library", headers: auth
    assert_equal 1, response.parsed_body.size
    put "/profiles/#{kid.id}/library/nao-existe", headers: auth
    assert_response :not_found
    delete "/profiles/#{kid.id}/library/moby-dick", headers: auth
    assert_response :no_content
  end

  test "sinais de interesse somam" do
    account = login
    kid = account.child_profiles.create!(name: "Maria")
    2.times { post "/profiles/#{kid.id}/signals", params: { kind: "valor", key: "Coragem" }, headers: auth }
    assert_equal 2, response.parsed_body["count"]
    post "/profiles/#{kid.id}/signals", params: { kind: "outro", key: "x" }, headers: auth
    assert_response :unprocessable_entity
  end

  test "leitor guarda página, quiz e diário" do
    account = login
    kid = account.child_profiles.create!(name: "Bento")
    title("moby-dick")
    put "/profiles/#{kid.id}/library/moby-dick", params: { status: "lendo", page: 5, pages_total: 16 }, headers: auth
    assert_equal [5, 16], response.parsed_body.values_at("page", "pages_total")
    put "/profiles/#{kid.id}/library/moby-dick", params: { status: "lido", quiz_score: 3, quiz_total: 4, diary: "  Quis saber se a baleia tinha mãe.  " }, headers: auth
    body = response.parsed_body
    assert_equal [3, 4, "Quis saber se a baleia tinha mãe.", 5], body.values_at("quiz_score", "quiz_total", "diary", "page")
    put "/profiles/#{kid.id}/library/moby-dick", params: { page: -1 }, headers: auth
    assert_response :unprocessable_entity
  end
end
